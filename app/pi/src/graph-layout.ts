import type { AgentView } from '@spacegraphjs/agent';
import {
    Strategies,
    type GraphLayout,
    type LaneLayoutStrategy,
    type LayoutConfig,
    type LayoutModel,
    type Position,
    type ScopeSpec,
} from 'spacegraphjs/layout';

export const GRAPH_LAYOUTS = ['freeform', 'timeline', 'timeline-rows', 'lanes', 'tree', 'force'] as const;
export type GraphLayoutMode = (typeof GRAPH_LAYOUTS)[number];

export const isGraphLayoutMode = (value: string | null | undefined): value is GraphLayoutMode =>
    value !== null && value !== undefined && (GRAPH_LAYOUTS as readonly string[]).includes(value);

const CARD: readonly [number, number] = [200, 72];
const LANES = ['run', 'unit', 'message', 'action'] as const;

type Node = LayoutModel['nodes'][number];
type Edge = LayoutModel['edges'][number];

const laneOf = (node: { kind: string }): (typeof LANES)[number] =>
    LANES.includes(node.kind as (typeof LANES)[number]) ? (node.kind as (typeof LANES)[number]) : 'action';

/** Translate the agent vocabulary into the generic layout contract once, outside the hot path. */
export function layoutConfig(view: AgentView): LayoutConfig<Node, Edge, (typeof LANES)[number]> {
    const unitID = (node: { data?: Record<string, unknown> }): string | undefined =>
        typeof node.data?.unitId === 'string' ? node.data.unitId : undefined;
    const unitNode = new Map(
        view.nodes.filter((node) => node.kind === 'unit' && unitID(node)).map((node) => [unitID(node)!, node.id]),
    );
    const unitOfNode = new Map(view.nodes.map((node) => [node.id, unitID(node)]));
    const parent = new Map<string, string>();
    const links = new Map<string, string[]>();
    for (const edge of view.edges) {
        if (edge.kind === 'contains') parent.set(edge.target, edge.source);
        else {
            for (const [from, to] of [
                [edge.source, edge.target],
                [edge.target, edge.source],
            ]) {
                const existing = links.get(from);
                if (existing) existing.push(to);
                else links.set(from, [to]);
            }
        }
    }
    return {
        nodeSizeFn: () => CARD,
        laneList: LANES,
        laneOfFn: laneOf,
        depthMap: { run: 0, unit: 1, message: 2, action: 3, artifact: 4, retry: 4 },
        turnIdFn: (node) => (node.kind === 'unit' ? node.id : unitNode.get(unitOfNode.get(node.id) ?? '')),
        parentOfFn: (_model, node) => parent.get(node.id),
        forceLinksFn: (_model, node) => links.get(node.id) ?? [],
        geometry: { standardSize: CARD, indentStep: 160, depthLevels: 5, padding: 24 },
    };
}

/** The generic model the layout strategies consume; identity and order come straight from the view. */
export function layoutModel(view: AgentView): LayoutModel<Node, Edge> {
    return {
        nodes: view.nodes,
        edges: view.edges,
        root: view.root,
        turns: view.turns ?? [],
    };
}

/**
 * Solve the requested graph view over the whole agent view. `previous` warms the append-only views
 * so a streamed turn does not reorder the cards the reader is looking at.
 */
export function computeGraphLayout(
    view: AgentView,
    mode: GraphLayoutMode,
    previous?: ReadonlyMap<string, Position>,
): GraphLayout | undefined {
    if (mode === 'freeform') return undefined;
    const rows = mode === 'timeline-rows';
    return Strategies.layoutGraph(layoutModel(view), layoutConfig(view), {
        strategy: (rows ? 'timeline' : mode) as LaneLayoutStrategy,
        orientation: rows ? 'rows' : 'columns',
        previous,
        gap: 24,
        laneGap: 32,
        turnGap: 96,
        rowGap: 32,
        columns: 1,
        treeColumns: 2,
    });
}

/** Map solved source-node positions onto the qualified ids ScopeSimulation consumes. */
export function layoutTargets(
    layout: GraphLayout | undefined,
    qualifiedByID: ReadonlyMap<string, string>,
): ReadonlyMap<string, Position> | undefined {
    if (!layout) return undefined;
    const targets = new Map<string, Position>();
    for (const [nodeID, position] of layout.positions) {
        const qualified = qualifiedByID.get(nodeID);
        if (qualified) targets.set(qualified, position);
    }
    return targets;
}

/** Source node id -> owning scope id, for cross-scope relation checks. */
export const scopeByNode = (specs: readonly ScopeSpec[]): ReadonlyMap<string, string> =>
    new Map(specs.flatMap((spec) => spec.nodes.map((node) => [node.id, spec.id] as const)));

export interface GraphShape {
    readonly nodes: number;
    readonly edges: number;
    readonly width: number;
    readonly height: number;
    readonly ratio: number;
    readonly meanEdgeLength: number;
    readonly crossScopeDiagonals: number;
    readonly overlaps: number;
}

const overlap = (a: Position, b: Position): boolean =>
    Math.abs(a.x - b.x) < CARD[0] && Math.abs(a.y - b.y) < CARD[1];

/** Measure graph shape from solved positions, never from visual memory. */
export function graphShape(
    view: AgentView,
    positions: ReadonlyMap<string, Position>,
    crossScope: (edge: Edge) => boolean = () => false,
): GraphShape {
    const placed = view.nodes.flatMap((node) => {
        const position = positions.get(node.id);
        return position ? [position] : [];
    });
    if (placed.length === 0) {
        return { nodes: 0, edges: 0, width: 0, height: 0, ratio: 0, meanEdgeLength: 0, crossScopeDiagonals: 0, overlaps: 0 };
    }
    const xs = placed.map((position) => position.x);
    const ys = placed.map((position) => position.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    const edges = view.edges.flatMap((edge) => {
        const from = positions.get(edge.source);
        const to = positions.get(edge.target);
        return from && to ? [{ edge, from, to, length: Math.hypot(to.x - from.x, to.y - from.y) }] : [];
    });
    const overlaps = view.edges.filter((edge) => {
        if (edge.kind !== 'contains') return false;
        const parent = positions.get(edge.source);
        const child = positions.get(edge.target);
        return parent && child ? overlap(parent, child) : false;
    }).length;
    return {
        nodes: placed.length,
        edges: edges.length,
        width,
        height,
        ratio: height / (width || 1),
        meanEdgeLength: edges.reduce((total, entry) => total + entry.length, 0) / (edges.length || 1),
        crossScopeDiagonals: edges.filter(
            (entry) => crossScope(entry.edge) && Math.abs(entry.to.x - entry.from.x) > width * 0.35 &&
                Math.abs(entry.to.y - entry.from.y) > height * 0.35,
        ).length,
        overlaps,
    };
}
