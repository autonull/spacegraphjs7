// Geometry for recursive scopes. Each scope solves its own interior; child scopes enter the parent
// as portal bodies sized from their solved bounds. Local frames are then composed top-down into
// world space, and edges are projected through those frames so a cross-scope edge has real endpoints.
//
// Every result is deterministic for a given tree, seed and previous state. No renderer is involved.

import { appendTo } from '../utils/collection';
import { clamp } from '../utils/math';
import {
    boundsFromExtents,
    transformBounds,
    unionBounds,
    type CenterBounds,
} from './bounds';
import { computeIncremental, interpolatedPositions, type IncrementalLayout } from './incremental';
import type { PlacementItem, Position } from './placement';
import {
    ScopeError,
    buildScopeTree,
    resolveScopeRef,
    scopeOf,
    type ScopeEntry,
    type ScopeSpec,
    type ScopeStrategy,
    type ScopeTree,
} from './scope';
import { ForcePlacement, type ForceMeta } from './force';
import { GridPlacement, type GridMeta } from './grid';
import { TreePlacement, type TreeMeta } from './tree';

interface SolverMeta extends ForceMeta, GridMeta, TreeMeta {}

type SolverItem = PlacementItem<SolverMeta>;

interface Solver {
    place(
        items: readonly SolverItem[],
        previous?: ReadonlyMap<string, Position>,
    ): ReadonlyMap<string, Position>;
}

export interface ScopeBounds {
    min: Position;
    max: Position;
    center: Position;
    size: [number, number, number];
}

export interface ScopeFrame {
    id: string;
    parent?: string;
    depth: number;
    /** The world position of this scope's origin. */
    origin: Position;
    /** World scale of this scope's contents. */
    scale: number;
    bounds: ScopeBounds;
    active: boolean;
}

export interface ScopeEdgeView {
    id: string;
    source: string;
    target: string;
    from: Position;
    to: Position;
    interScope: boolean;
}

export interface ScopeLayout {
    /** Qualified node id -> world position. */
    positions: ReadonlyMap<string, Position>;
    /** Qualified node id -> position in its owning scope. */
    locals: ReadonlyMap<string, Position>;
    frames: ReadonlyMap<string, ScopeFrame>;
    edges: readonly ScopeEdgeView[];
    bounds: ScopeBounds;
}

export interface ScopeSignals {
    /** Zoom band. Scopes deeper than `band + 1` are inactive. */
    band?: number;
    /** A qualified node or scope id whose ancestors stay active. */
    focus?: string;
    /** Explicit depth cap; wins over `band`. */
    maxDepth?: number;
}

export interface ScopeLayoutOptions {
    /** Default strategy for scopes that do not declare one. */
    strategy?: ScopeStrategy;
    seed?: number;
    /** Base spacing passed to the solvers. */
    gap?: number;
    /** Measured 0..1 canvas coverage feeding scale-aware spacing; absent means keep the base gap. */
    occupancy?: number;
    /** 0..1 coverage target; with `occupancy`, tightens collision slack below it down to half. */
    targetOccupancy?: number;
    depthStep?: number;
    nodePadding?: number;
    /** Local positions keyed by scope path. Used by `pinned` and, optionally, as a solver warm start. */
    previous?: ReadonlyMap<string, ReadonlyMap<string, Position>>;
    /** Seed the solvers with previous positions instead of reflowing. */
    warmStart?: boolean;
    /** Qualified ids forced to their previous local position. */
    pinned?: ReadonlySet<string>;
    /** Active scope paths; inactive scopes are still laid out but flagged. */
    active?: ReadonlySet<string>;
}

const DEFAULT_WIDTH = 120;
const DEFAULT_HEIGHT = 64;

const zero = (): Position => ({ x: 0, y: 0, z: 0 });

const emptyBounds = (): CenterBounds => boundsFromExtents(0, 0, 0, 0, 0, 0);

const hashPath = (path: string): number => {
    let hash = 2166136261;
    for (let i = 0; i < path.length; i++) hash = Math.imul(hash ^ path.charCodeAt(i), 16777619);
    return hash >>> 0;
};

const itemsBounds = (
    items: readonly SolverItem[],
    positions: ReadonlyMap<string, Position>,
): CenterBounds => {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const item of items) {
        const position = positions.get(item.id);
        if (!position) continue;
        const halfWidth = item.width / 2;
        const halfHeight = (item.height ?? item.width) / 2;
        const z = position.z ?? 0;
        minX = Math.min(minX, position.x - halfWidth);
        maxX = Math.max(maxX, position.x + halfWidth);
        minY = Math.min(minY, position.y - halfHeight);
        maxY = Math.max(maxY, position.y + halfHeight);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
    }
    return minX === Infinity ? emptyBounds() : boundsFromExtents(minX, minY, minZ, maxX, maxY, maxZ);
};

interface ScopeLayoutState {
    readonly tree: ScopeTree;
    readonly options: ScopeLayoutOptions;
    readonly padding: number;
    readonly localsByPath: Map<string, Map<string, Position>>;
    readonly boundsByPath: Map<string, ScopeBounds>;
    readonly locals: Map<string, Position>;
    readonly frames: Map<string, ScopeFrame>;
    readonly world: Map<string, Position>;
    readonly edges: ScopeEdgeView[];
}

/** Shared 3-axis transform; only z tolerates a missing component, as scope positions allow. */
const transformPoint = (origin: Position, scale: number, point: Position): Position => ({
    x: origin.x + scale * point.x,
    y: origin.y + scale * point.y,
    z: origin.z + scale * (point.z ?? 0),
});

type ScopeItemExtra = Pick<GridMeta, 'lane' | 'row'> & Pick<TreeMeta, 'parent'>;

const makeItem = (
    id: string,
    width: number,
    height: number,
    links: readonly string[],
    depth: number,
    extra?: ScopeItemExtra,
): SolverItem => ({
    id,
    width,
    height,
    depth,
    meta: { links, radius: Math.max(width, height) / 2, ...extra },
});

const portalSize = (bounds: ScopeBounds, padding: number): readonly [number, number] => [
    bounds.size[0] + padding * 2,
    bounds.size[1] + padding * 2,
];

function solveScopes(state: ScopeLayoutState, entry: ScopeEntry): void {
    for (const child of entry.children) solveScopes(state, child);

    const links = new Map<string, string[]>();
    const addLink = (from: string, to: string): void => appendTo(links, from, to);
    const portalNodeIds = new Map(
        entry.nodes
            .filter((node) => node.scope && entry.children.some((child) => child.spec.id === node.scope))
            .map((node) => [node.scope!, node.id]),
    );
    const localId = (qualified: string): string | undefined => {
        const prefix = `${entry.path}/`;
        if (!qualified.startsWith(prefix)) return undefined;
        const local = qualified.slice(prefix.length);
        return portalNodeIds.get(local) ?? local;
    };

    for (const edge of entry.edges) {
        const source = localId(resolveScopeRef(state.tree, entry.path, edge.source));
        const target = localId(resolveScopeRef(state.tree, entry.path, edge.target));
        if (source === undefined || target === undefined) continue;
        addLink(source, target);
        addLink(target, source);
    }

    const items: SolverItem[] = [];
    for (const node of entry.nodes) {
        const child = node.scope
            ? entry.children.find((candidate) => candidate.spec.id === node.scope)
            : undefined;
        const bounds = child ? state.boundsByPath.get(child.path)! : undefined;
        const [declaredWidth, declaredHeight] = node.size ?? [DEFAULT_WIDTH, DEFAULT_HEIGHT];
        const [width, height] = bounds ? portalSize(bounds, state.padding) : [declaredWidth, declaredHeight];
        items.push(
            makeItem(node.id, width, height, links.get(node.id) ?? [], node.depth ?? 0, {
                lane: node.lane,
                row: node.row,
                parent: node.parent,
            }),
        );
    }

    for (const child of entry.children) {
        if (portalNodeIds.has(child.spec.id)) continue;
        const [width, height] = portalSize(state.boundsByPath.get(child.path)!, state.padding);
        items.push(makeItem(child.spec.id, width, height, links.get(child.spec.id) ?? [], 0));
    }

    const solver = makeSolver(
        entry.spec.strategy ?? state.options.strategy ?? 'force',
        (hashPath(entry.path) ^ (state.options.seed ?? 0)) >>> 0,
        state.options,
        items,
    );
    const previous = state.options.previous?.get(entry.path);
    const solved = solver.place(items, state.options.warmStart ? previous : undefined);
    const local = new Map<string, Position>();

    for (const item of items) {
        const qualified = `${entry.path}/${item.id}`;
        const held = state.options.pinned?.has(qualified) ? previous?.get(item.id) : undefined;
        const position = held ?? solved.get(item.id) ?? zero();
        local.set(item.id, position);
        state.locals.set(qualified, position);
    }
    state.localsByPath.set(entry.path, local);
    state.boundsByPath.set(entry.path, itemsBounds(items, local));
}

function placeFrames(state: ScopeLayoutState, entry: ScopeEntry, parent?: ScopeFrame): void {
    const scale = (parent?.scale ?? 1) * (entry.spec.scale ?? 1);
    const local = state.localsByPath.get(entry.path)!;
    const parentEntry = parent ? state.tree.byPath.get(parent.id) : undefined;
    const portalNodeId =
        parentEntry?.nodes.find((node) => node.scope === entry.spec.id)?.id ?? entry.spec.id;
    const portal = parent ? state.localsByPath.get(parent.id)?.get(portalNodeId) : undefined;
    const offset = entry.spec.offset ?? zero();
    const origin = parent
        ? transformPoint(parent.origin, parent.scale, {
              x: (portal?.x ?? 0) + offset.x,
              y: (portal?.y ?? 0) + offset.y,
              z: (portal?.z ?? 0) + offset.z,
          })
        : { x: offset.x, y: offset.y, z: offset.z };

    const frame: ScopeFrame = {
        id: entry.path,
        parent: parent?.id,
        depth: entry.depth,
        origin,
        scale,
        bounds: transformBounds(state.boundsByPath.get(entry.path)!, origin, scale),
        active: state.options.active ? state.options.active.has(entry.path) : true,
    };
    state.frames.set(entry.path, frame);

    for (const node of entry.nodes)
        state.world.set(
            `${entry.path}/${node.id}`,
            transformPoint(origin, scale, local.get(node.id) ?? zero()),
        );
    for (const child of entry.children) placeFrames(state, child, frame);
}

function collectScopeEdges(state: ScopeLayoutState, entry: ScopeEntry): void {
    for (const edge of entry.edges) {
        const source = resolveScopeRef(state.tree, entry.path, edge.source);
        const target = resolveScopeRef(state.tree, entry.path, edge.target);
        const from = state.world.get(source) ?? state.frames.get(source)?.origin;
        const to = state.world.get(target) ?? state.frames.get(target)?.origin;
        if (!from || !to) throw new ScopeError('unknown-endpoint', `cannot project edge ${edge.id}`);
        state.edges.push({
            id: edge.id,
            source,
            target,
            from,
            to,
            interScope: scopeOf(state.tree, source) !== scopeOf(state.tree, target),
        });
    }
    for (const child of entry.children) collectScopeEdges(state, child);
}

/** Scale-aware packing: sparse coverage tightens collision slack toward the target, floored at half. */
export const occupancySpacingFactor = (occupancy?: number, target?: number): number => {
    if (!occupancy || !target || target <= 0) return 1;
    return clamp(occupancy / target, 0.5, 1);
};

function makeSolver(
    strategy: ScopeStrategy,
    seed: number,
    options: ScopeLayoutOptions,
    items: readonly PlacementItem[],
): Solver {
    const gap = options.gap ?? 160;
    const nodePadding =
        (options.nodePadding ?? 20) * occupancySpacingFactor(options.occupancy, options.targetOccupancy);
    if (strategy === 'grid') {
        const tallest = Math.max(80, ...items.map((item) => item.height));
        const widest = Math.max(80, ...items.map((item) => item.width));
        return new GridPlacement({
            step: Math.max(gap, widest * 0.2),
            lanePitch: Math.max(tallest * 1.5, 140) + nodePadding + gap,
            groupGap: gap * 2,
            depthStep: options.depthStep ?? 64,
        });
    }
    if (strategy === 'tree') {
        return new TreePlacement({
            columnPitch: gap * 2,
            rowPitch: gap,
            depthStep: options.depthStep ?? 64,
        });
    }
    return new ForcePlacement({
        seed,
        spacing: gap,
        depthStep: options.depthStep ?? 64,
        nodePadding,
        useBarnesHut: items.length > 200,
    });
}

/** The scope paths that should be simulated at a zoom band, plus the ancestors of the focus. */
export function activeScopePaths(tree: ScopeTree, signals: ScopeSignals = {}): ReadonlySet<string> {
    const maxDepth = signals.maxDepth ?? (signals.band === undefined ? Infinity : signals.band + 1);
    const active = new Set<string>();
    for (const [path, entry] of tree.byPath) {
        if (entry.depth <= maxDepth) active.add(path);
    }
    if (signals.focus) {
        const path = tree.nodePaths.get(signals.focus) ?? signals.focus;
        let entry = tree.byPath.get(path);
        while (entry) {
            active.add(entry.path);
            entry = entry.parent;
        }
    }
    return active;
}

/** Solve every scope, compose their frames, and project the full graph into world space. */
export function layoutScopes(tree: ScopeTree, options: ScopeLayoutOptions = {}): ScopeLayout {
    const state: ScopeLayoutState = {
        tree,
        options,
        padding: options.nodePadding ?? 20,
        localsByPath: new Map(),
        boundsByPath: new Map(),
        locals: new Map(),
        frames: new Map(),
        world: new Map(),
        edges: [],
    };
    for (const root of tree.roots) solveScopes(state, root);
    for (const root of tree.roots) placeFrames(state, root);
    for (const root of tree.roots) collectScopeEdges(state, root);

    const frameBounds = [...state.frames.values()].map((frame) => frame.bounds);
    const bounds = frameBounds.length
        ? frameBounds.slice(1).reduce(unionBounds, frameBounds[0]!)
        : emptyBounds();
    return {
        positions: state.world,
        locals: state.locals,
        frames: state.frames,
        edges: state.edges,
        bounds,
    };
}

/** The incremental change between two scope layouts, for animated transitions. */
export const scopeChanges = (
    previous: ScopeLayout | undefined,
    next: ScopeLayout,
): IncrementalLayout => computeIncremental(next.positions, previous?.positions);

export const scopePositionsAt = (
    change: IncrementalLayout,
    t: number,
): ReadonlyMap<string, Position> => interpolatedPositions(change, t);

export interface HostedScopeLayout extends ScopeLayout {
    change: IncrementalLayout;
    tree: ScopeTree;
}

const localState = (
    tree: ScopeTree,
    layout: ScopeLayout,
): ReadonlyMap<string, ReadonlyMap<string, Position>> => {
    const state = new Map<string, Map<string, Position>>();
    for (const path of tree.byPath.keys()) state.set(path, new Map());
    for (const [id, position] of layout.locals) {
        const path = scopeOf(tree, id);
        if (!path) continue;
        state.get(path)!.set(id.slice(path.length + 1), position);
    }
    return state;
};

/** A stateful host helper: keeps local positions across updates and reports what moved. */
export class ScopeHost {
    readonly #options: ScopeLayoutOptions;
    #previous?: ReadonlyMap<string, ReadonlyMap<string, Position>>;
    #last?: ScopeLayout;

    constructor(options: ScopeLayoutOptions = {}) {
        this.#options = options;
    }

    get last(): ScopeLayout | undefined {
        return this.#last;
    }

    update(
        specs: readonly ScopeSpec[],
        signals: ScopeSignals = {},
        overrides: ScopeLayoutOptions = {},
    ): HostedScopeLayout {
        const tree = buildScopeTree(specs);
        const layout = layoutScopes(tree, {
            ...this.#options,
            ...overrides,
            previous: this.#previous,
            active: activeScopePaths(tree, signals),
        });
        this.#previous = localState(tree, layout);
        const change = computeIncremental(layout.positions, this.#last?.positions);
        this.#last = layout;
        return { ...layout, change, tree };
    }
}
