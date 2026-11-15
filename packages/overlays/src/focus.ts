import type { GraphViewData, GraphNode, GraphEdge } from '@spacegraphjs/shared';

/** Options for computing the focus overlay. */
export interface FocusOverlayOptions {
    /** The graph model. */
    model: GraphViewData;
    /** Selected node IDs (distance 0). */
    selection: readonly string[];
    /** Optional node ID being streamed (temporarily highlight around new node). */
    streamingNode?: string;
    /** Maximum BFS distance to compute. Default: 3. */
    maxDistance?: number;
}

/** Focus overlay mapping node IDs to their BFS distance from the nearest selected node. */
export type FocusOverlay = Map<string, number>;

/** Opacity stops for each distance. Used for D1 neighborhood highlighting. */
export const FOCUS_OPACITY_STOPS: readonly number[] = [1, 0.85, 0.6, 0.35, 0.15];

/**
 * Get the opacity for a given focus distance.
 * Distance 0 = selected (1.0), 1 = 0.85, 2 = 0.6, 3 = 0.35, >3 = 0.15
 */
export function getFocusOpacity(distance: number): number {
    if (distance <= 0) return FOCUS_OPACITY_STOPS[0];
    if (distance >= FOCUS_OPACITY_STOPS.length) return FOCUS_OPACITY_STOPS[FOCUS_OPACITY_STOPS.length - 1];
    return FOCUS_OPACITY_STOPS[distance];
}

/**
 * Check if a node should be dimmed based on its focus distance.
 * Nodes with distance > maxDistance are considered "out of focus".
 */
export function isDimmed(distance: number | undefined, maxDistance: number): boolean {
    if (distance === undefined) return true;
    return distance > maxDistance;
}

/**
 * Compute a graded focus overlay mapping each node to its BFS distance
 * from the nearest selected node.
 *
 * Distance mapping:
 * - 0 (selected): not dimmed (handled by selected check in emphasis)
 * - 1: 0.85 opacity
 * - 2: 0.6 opacity
 * - 3: 0.35 opacity
 * - >3: 0.15 opacity
 */
export function computeFocusOverlay(options: FocusOverlayOptions): FocusOverlay {
    const { model, selection, streamingNode, maxDistance = 3 } = options;

    const sourceIds = [...selection];
    if (streamingNode) sourceIds.push(streamingNode);

    if (sourceIds.length === 0) return new Map();

    const distance = new Map<string, number>();
    const queue: Array<{ id: string; dist: number }> = [];

    // Initialize queue with selected/streaming nodes at distance 0
    for (const id of sourceIds) {
        distance.set(id, 0);
        queue.push({ id, dist: 0 });
    }

    // BFS from all source nodes simultaneously
    // This gives minimum distance to any source node
    const visited = new Set<string>(sourceIds);

    // Build adjacency for efficient traversal
    const outgoing = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();

    for (const edge of model.edges) {
        if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
        outgoing.get(edge.source)!.push(edge.target);

        if (!incoming.has(edge.target)) incoming.set(edge.target, []);
        incoming.get(edge.target)!.push(edge.source);
    }

    while (queue.length > 0) {
        const { id, dist } = queue.shift()!;
        if (dist >= maxDistance) continue;

        const nextDist = dist + 1;

        // Traverse outgoing edges
        for (const target of outgoing.get(id) ?? []) {
            if (!visited.has(target)) {
                visited.add(target);
                distance.set(target, nextDist);
                queue.push({ id: target, dist: nextDist });
            }
        }

        // Traverse incoming edges
        for (const source of incoming.get(id) ?? []) {
            if (!visited.has(source)) {
                visited.add(source);
                distance.set(source, nextDist);
                queue.push({ id: source, dist: nextDist });
            }
        }
    }

    return distance;
}