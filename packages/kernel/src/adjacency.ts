import type { Edge, NodeID } from './kernel';
/**
 * Builds an id-keyed adjacency map for a kernel's edges. `visit` decides which directions of each
 * edge to include and which value to store, so queries, walks and path searches share one builder.
 */
export const adjacencyOf = <Value>(
    edges: readonly Edge[],
    visit: (edge: Edge, add: (from: NodeID, value: Value) => void) => void,
): Map<NodeID, Value[]> => {
    const map = new Map<NodeID, Value[]>();
    const add = (from: NodeID, value: Value): void => {
        const bucket = map.get(from);
        if (bucket) bucket.push(value);
        else map.set(from, [value]);
    };
    for (const edge of edges) visit(edge, add);
    return map;
};
