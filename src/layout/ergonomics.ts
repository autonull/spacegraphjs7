import { clamp } from '../utils/math';
import type { Position } from './placement';

/** Host-agnostic inputs: a graph, the surface it must fit, and the legibility floor. */
export interface ErgonomicsNode {
    readonly id: string;
    readonly width?: number;
    readonly height?: number;
}

export interface ErgonomicsEdge {
    readonly source: string;
    readonly target: string;
    readonly weight?: number;
}

export interface ErgonomicsViewport {
    readonly width: number;
    readonly height: number;
}

export interface ErgonomicsOptions {
    /** Fraction of the surface the cards should carry, before gaps. Default 0.62. */
    readonly targetOccupancy?: number;
    /** Smallest card that still fits a label and a status chip. */
    readonly minCard?: readonly [number, number];
    readonly maxCard?: readonly [number, number];
    readonly gap?: number;
    readonly maxColumns?: number;
    readonly refinementPasses?: number;
}

export interface ErgonomicsMetrics {
    readonly occupancy: number;
    readonly meanEdgeLength: number;
    readonly aspectFit: number;
    readonly overlaps: number;
    readonly labelFloorMet: boolean;
    readonly columns: number;
    readonly rows: number;
    readonly nodes: number;
    readonly score: number;
}

export interface ErgonomicLayout {
    readonly positions: ReadonlyMap<string, Position>;
    readonly card: readonly [number, number];
    readonly columns: number;
    readonly metrics: ErgonomicsMetrics;
}

const DEFAULT_CARD: readonly [number, number] = [180, 72];

/**
 * Place highly connected nodes first, then the unplaced node with the strongest ties to what is
 * already placed. This is a Cuthill–McKee-style heuristic: linked nodes land in neighbouring slots,
 * so a row-major grid has short edges without any host notion of turns or scopes.
 */
export const orderByProximity = (
    nodes: readonly ErgonomicsNode[],
    edges: readonly ErgonomicsEdge[],
): readonly string[] => {
    const neighbours = new Map<string, Map<string, number>>();
    const degree = new Map<string, number>();
    for (const node of nodes) {
        neighbours.set(node.id, new Map());
        degree.set(node.id, 0);
    }
    for (const edge of edges) {
        const weight = edge.weight ?? 1;
        for (const [from, to] of [[edge.source, edge.target], [edge.target, edge.source]] as const) {
            if (from === to || !neighbours.has(from) || !neighbours.has(to)) continue;
            neighbours.get(from)!.set(to, (neighbours.get(from)!.get(to) ?? 0) + weight);
            degree.set(from, degree.get(from)! + weight);
        }
    }
    const remaining = new Set(nodes.map((node) => node.id));
    const order: string[] = [];
    while (remaining.size) {
        let best: string | undefined;
        let bestScore = -Infinity;
        for (const id of remaining) {
            let ties = 0;
            for (const [other, weight] of neighbours.get(id)!) if (!remaining.has(other)) ties += weight;
            const score = ties * 100 + degree.get(id)!;
            if (score > bestScore || (score === bestScore && best !== undefined && id < best)) {
                best = id;
                bestScore = score;
            }
        }
        order.push(best!);
        remaining.delete(best!);
    }
    return order;
};

/** Swap slots while the total squared edge length falls; bounded so large graphs stay cheap. */
export const refineBySwaps = (
    order: readonly string[],
    edges: readonly ErgonomicsEdge[],
    columns: number,
    passes = 2,
): readonly string[] => {
    if (order.length < 3 || columns < 1) return order;
    const result = [...order];
    const loc = new Map(result.map((id, index) => [id, index] as const));
    const cost = (): number => {
        let total = 0;
        for (const edge of edges) {
            const from = loc.get(edge.source);
            const to = loc.get(edge.target);
            if (from === undefined || to === undefined) continue;
            const ax = from % columns;
            const ay = Math.floor(from / columns);
            const bx = to % columns;
            const by = Math.floor(to / columns);
            total += (edge.weight ?? 1) * ((ax - bx) ** 2 + (ay - by) ** 2);
        }
        return total;
    };
    for (let pass = 0; pass < passes; pass++) {
        let changed = false;
        for (let i = 0; i < result.length; i++) {
            for (let j = i + 1; j < result.length; j++) {
                const before = cost();
                const a = result[i]!;
                const b = result[j]!;
                result[i] = b;
                result[j] = a;
                loc.set(b, i);
                loc.set(a, j);
                if (cost() < before) changed = true;
                else {
                    result[i] = a;
                    result[j] = b;
                    loc.set(a, i);
                    loc.set(b, j);
                }
            }
        }
        if (!changed) break;
    }
    return result;
};

/** Column count whose grid aspect is closest to the surface aspect. */
export const chooseColumns = (count: number, viewport: ErgonomicsViewport, maxColumns = 4): number => {
    if (count < 1) return 1;
    const aspect = viewport.width / Math.max(viewport.height, 1);
    const ideal = Math.sqrt(count * aspect);
    return clamp(Math.round(ideal), 1, Math.max(1, maxColumns));
};

const overlapsFor = (
    positions: ReadonlyMap<string, Position>,
    nodes: readonly ErgonomicsNode[],
    card: readonly [number, number],
): number => {
    let overlaps = 0;
    for (let i = 0; i < nodes.length; i++) {
        const a = positions.get(nodes[i]!.id);
        if (!a) continue;
        for (let j = i + 1; j < nodes.length; j++) {
            const b = positions.get(nodes[j]!.id);
            if (!b) continue;
            if (Math.abs(a.x - b.x) < card[0] && Math.abs(a.y - b.y) < card[1]) overlaps++;
        }
    }
    return overlaps;
};

const scoreOf = (metrics: Omit<ErgonomicsMetrics, 'score'>, scale: number): number =>
    metrics.occupancy * 0.4 +
    metrics.aspectFit * 0.25 +
    (1 / (1 + metrics.meanEdgeLength / Math.max(1, scale))) * 0.35 -
    metrics.overlaps * 10 -
    (metrics.labelFloorMet ? 0 : 2);

/**
 * Solve a compact, legible grid for any graph and surface. No DOM, renderer or host vocabulary:
 * the caller supplies sizes, edges and a viewport; the result is solved positions plus measured
 * ergonomics so hosts can compare candidates instead of trusting a screenshot.
 */
export const solveErgonomicLayout = (
    nodes: readonly ErgonomicsNode[],
    edges: readonly ErgonomicsEdge[],
    viewport: ErgonomicsViewport,
    options: ErgonomicsOptions = {},
): ErgonomicLayout | undefined => {
    if (nodes.length === 0 || viewport.width <= 0 || viewport.height <= 0) return undefined;
    const gap = options.gap ?? 16;
    const minCard = options.minCard ?? DEFAULT_CARD;
    const maxCard = options.maxCard ?? [viewport.width, viewport.height];
    const target = clamp(options.targetOccupancy ?? 0.62, 0.1, 0.95);
    const maxColumns = options.maxColumns ?? 4;
    const passes = options.refinementPasses ?? 2;
    const proximity = orderByProximity(nodes, edges);

    let best: ErgonomicLayout | undefined;
    for (let columns = 1; columns <= Math.min(maxColumns, nodes.length); columns++) {
        const rows = Math.ceil(nodes.length / columns);
        const card: readonly [number, number] = [
            clamp((viewport.width - gap * (columns - 1)) / columns, minCard[0], maxCard[0]),
            clamp((viewport.height - gap * (rows - 1)) / rows, minCard[1], maxCard[1]),
        ];
        const order = refineBySwaps(proximity, edges, columns, passes);
        const positions = new Map<string, Position>(
            order.map((id, index) => [
                id,
                {
                    x: (index % columns) * (card[0] + gap),
                    y: Math.floor(index / columns) * (card[1] + gap),
                    z: 0,
                },
            ]),
        );
        const gridWidth = columns * card[0] + (columns - 1) * gap;
        const gridHeight = rows * card[1] + (rows - 1) * gap;
        let edgeLength = 0;
        let edgeCount = 0;
        for (const edge of edges) {
            const from = positions.get(edge.source);
            const to = positions.get(edge.target);
            if (!from || !to) continue;
            edgeLength += Math.hypot(from.x - to.x, from.y - to.y) * (edge.weight ?? 1);
            edgeCount++;
        }
        const occupancy = (columns * rows * card[0] * card[1]) / (viewport.width * viewport.height);
        const ratio = Math.log((gridWidth / gridHeight) / (viewport.width / viewport.height));
        const partial = {
            occupancy: Math.min(occupancy, target) / target,
            meanEdgeLength: edgeCount ? edgeLength / edgeCount : 0,
            aspectFit: 1 / (1 + Math.abs(ratio)),
            overlaps: overlapsFor(positions, nodes, card),
            labelFloorMet: card[0] >= minCard[0] && card[1] >= minCard[1],
            columns,
            rows,
            nodes: nodes.length,
        };
        const score = scoreOf(partial, Math.hypot(viewport.width, viewport.height));
        if (!best || score > best.metrics.score)
            best = { positions, card, columns, metrics: { ...partial, score } };
    }
    return best;
};
