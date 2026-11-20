// Geometry for recursive scopes. Each scope solves its own interior; child scopes enter the parent
// as portal bodies sized from their solved bounds. Local frames are then composed top-down into
// world space, and edges are projected through those frames so a cross-scope edge has real endpoints.
//
// Every result is deterministic for a given tree, seed and previous state. No renderer is involved.

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

const emptyBounds = (): ScopeBounds => ({
    min: zero(),
    max: zero(),
    center: zero(),
    size: [0, 0, 0],
});

const hashPath = (path: string): number => {
    let hash = 2166136261;
    for (let i = 0; i < path.length; i++) hash = Math.imul(hash ^ path.charCodeAt(i), 16777619);
    return hash >>> 0;
};

const boundsOf = (items: readonly SolverItem[], positions: ReadonlyMap<string, Position>): ScopeBounds => {
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
    if (minX === Infinity) return emptyBounds();

    return {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
        center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
        size: [maxX - minX, maxY - minY, maxZ - minZ],
    };
};

const scaleBounds = (bounds: ScopeBounds, origin: Position, scale: number): ScopeBounds => ({
    min: {
        x: origin.x + bounds.min.x * scale,
        y: origin.y + bounds.min.y * scale,
        z: origin.z + bounds.min.z * scale,
    },
    max: {
        x: origin.x + bounds.max.x * scale,
        y: origin.y + bounds.max.y * scale,
        z: origin.z + bounds.max.z * scale,
    },
    center: {
        x: origin.x + bounds.center.x * scale,
        y: origin.y + bounds.center.y * scale,
        z: origin.z + bounds.center.z * scale,
    },
    size: [bounds.size[0] * scale, bounds.size[1] * scale, bounds.size[2] * scale],
});

const unionBounds = (a: ScopeBounds, b: ScopeBounds): ScopeBounds => {
    const min = { x: Math.min(a.min.x, b.min.x), y: Math.min(a.min.y, b.min.y), z: Math.min(a.min.z, b.min.z) };
    const max = { x: Math.max(a.max.x, b.max.x), y: Math.max(a.max.y, b.max.y), z: Math.max(a.max.z, b.max.z) };
    return {
        min,
        max,
        center: { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 },
        size: [max.x - min.x, max.y - min.y, max.z - min.z],
    };
};

function makeSolver(strategy: ScopeStrategy, seed: number, options: ScopeLayoutOptions): Solver {
    const gap = options.gap ?? 160;
    if (strategy === 'grid') {
        return new GridPlacement({
            step: gap,
            lanePitch: gap,
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
        nodePadding: options.nodePadding ?? 20,
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
    const padding = options.nodePadding ?? 20;
    const localsByPath = new Map<string, Map<string, Position>>();
    const boundsByPath = new Map<string, ScopeBounds>();
    const locals = new Map<string, Position>();

    const solve = (entry: ScopeEntry): void => {
        for (const child of entry.children) solve(child);

        const links = new Map<string, string[]>();
        const addLink = (from: string, to: string): void => {
            const existing = links.get(from);
            if (existing) existing.push(to);
            else links.set(from, [to]);
        };
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
            const source = localId(resolveScopeRef(tree, entry.path, edge.source));
            const target = localId(resolveScopeRef(tree, entry.path, edge.target));
            if (source === undefined || target === undefined) continue;
            addLink(source, target);
            addLink(target, source);
        }

        const items: SolverItem[] = [];
        for (const node of entry.nodes) {
            const child = node.scope ? entry.children.find((candidate) => candidate.spec.id === node.scope) : undefined;
            const [declaredWidth, declaredHeight] = node.size ?? [DEFAULT_WIDTH, DEFAULT_HEIGHT];
            const bounds = child ? boundsByPath.get(child.path)! : undefined;
            const width = bounds ? bounds.size[0] + padding * 2 : declaredWidth;
            const height = bounds ? bounds.size[1] + padding * 2 : declaredHeight;
            items.push({
                id: node.id,
                width,
                height,
                depth: node.depth ?? 0,
                meta: {
                    links: links.get(node.id) ?? [],
                    radius: Math.max(width, height) / 2,
                    lane: node.lane,
                    row: node.row,
                    parent: node.parent,
                },
            });
        }

        for (const child of entry.children) {
            if (portalNodeIds.has(child.spec.id)) continue;
            const bounds = boundsByPath.get(child.path)!;
            const width = bounds.size[0] + padding * 2;
            const height = bounds.size[1] + padding * 2;
            items.push({
                id: child.spec.id,
                width,
                height,
                depth: 0,
                meta: { links: links.get(child.spec.id) ?? [], radius: Math.max(width, height) / 2 },
            });
        }

        const solver = makeSolver(
            entry.spec.strategy ?? options.strategy ?? 'force',
            (hashPath(entry.path) ^ (options.seed ?? 0)) >>> 0,
            options,
        );
        const previous = options.previous?.get(entry.path);
        const solved = solver.place(items, options.warmStart ? previous : undefined);
        const local = new Map<string, Position>();

        for (const item of items) {
            const qualified = `${entry.path}/${item.id}`;
            const held = options.pinned?.has(qualified) ? previous?.get(item.id) : undefined;
            const position = held ?? solved.get(item.id) ?? zero();
            local.set(item.id, position);
            locals.set(qualified, position);
        }
        localsByPath.set(entry.path, local);
        boundsByPath.set(entry.path, boundsOf(items, local));
    };
    for (const root of tree.roots) solve(root);

    const frames = new Map<string, ScopeFrame>();
    const world = new Map<string, Position>();

    const placeFrame = (entry: ScopeEntry, parent?: ScopeFrame): void => {
        const scale = (parent?.scale ?? 1) * (entry.spec.scale ?? 1);
        const local = localsByPath.get(entry.path)!;
        const parentEntry = parent ? tree.byPath.get(parent.id) : undefined;
        const portalNodeId =
            parentEntry?.nodes.find((node) => node.scope === entry.spec.id)?.id ?? entry.spec.id;
        const portal = parent ? localsByPath.get(parent.id)?.get(portalNodeId) : undefined;
        const offset = entry.spec.offset ?? zero();
        const origin = parent
            ? {
                  x: parent.origin.x + parent.scale * ((portal?.x ?? 0) + offset.x),
                  y: parent.origin.y + parent.scale * ((portal?.y ?? 0) + offset.y),
                  z: parent.origin.z + parent.scale * ((portal?.z ?? 0) + offset.z),
              }
            : { x: offset.x, y: offset.y, z: offset.z };

        frames.set(entry.path, {
            id: entry.path,
            parent: parent?.id,
            depth: entry.depth,
            origin,
            scale,
            bounds: scaleBounds(boundsByPath.get(entry.path)!, origin, scale),
            active: options.active ? options.active.has(entry.path) : true,
        });

        for (const node of entry.nodes) {
            const position = local.get(node.id) ?? zero();
            world.set(`${entry.path}/${node.id}`, {
                x: origin.x + scale * position.x,
                y: origin.y + scale * position.y,
                z: origin.z + scale * (position.z ?? 0),
            });
        }
        for (const child of entry.children) placeFrame(child, frames.get(entry.path)!);
    };
    for (const root of tree.roots) placeFrame(root);

    const edges: ScopeEdgeView[] = [];
    const collectEdges = (entry: ScopeEntry): void => {
        for (const edge of entry.edges) {
            const source = resolveScopeRef(tree, entry.path, edge.source);
            const target = resolveScopeRef(tree, entry.path, edge.target);
            const from = world.get(source) ?? frames.get(source)?.origin;
            const to = world.get(target) ?? frames.get(target)?.origin;
            if (!from || !to) {
                throw new ScopeError('unknown-endpoint', `cannot project edge ${edge.id}`);
            }
            edges.push({
                id: edge.id,
                source,
                target,
                from,
                to,
                interScope: scopeOf(tree, source) !== scopeOf(tree, target),
            });
        }
        for (const child of entry.children) collectEdges(child);
    };
    for (const root of tree.roots) collectEdges(root);

    const frameBounds = [...frames.values()].map((frame) => frame.bounds);
    const bounds = frameBounds.length
        ? frameBounds.slice(1).reduce(unionBounds, frameBounds[0])
        : emptyBounds();

    return { positions: world, locals, frames, edges, bounds };
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
