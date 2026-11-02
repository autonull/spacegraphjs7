import type { GraphViewData, GraphNode } from './types';

/**
 * Finds a node by ID in the graph model.
 */
export function nodeByID(model: GraphViewData, id: string): GraphNode | undefined {
    return model.nodes.find((node) => node.id === id);
}

/**
 * Finds an edge by ID in the graph model.
 */
export function edgeByID(
    model: GraphViewData,
    id: string,
): { source: string; target: string; kind: string } | undefined {
    return model.edges.find((edge) => edge.id === id);
}

/**
 * Gets all nodes connected to a given node (both incoming and outgoing).
 */
export function getConnectedNodes(model: GraphViewData, nodeId: string): GraphNode[] {
    const connectedIds = new Set<string>();
    for (const edge of model.edges) {
        if (edge.source === nodeId) connectedIds.add(edge.target);
        if (edge.target === nodeId) connectedIds.add(edge.source);
    }
    return model.nodes.filter((node) => connectedIds.has(node.id));
}

/**
 * Gets the incoming edges for a node.
 */
export function getIncomingEdges(model: GraphViewData, nodeId: string) {
    return model.edges.filter((edge) => edge.target === nodeId);
}

/**
 * Gets the outgoing edges for a node.
 */
export function getOutgoingEdges(model: GraphViewData, nodeId: string) {
    return model.edges.filter((edge) => edge.source === nodeId);
}

/** Tone of a unified diff line. */
export type DiffTone = 'header' | 'added' | 'removed' | 'context';

/** Returns the tone of a unified diff line. */
export function diffTone(line: string): DiffTone {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) return 'header';
    if (line.startsWith('+')) return 'added';
    if (line.startsWith('-')) return 'removed';
    return 'context';
}
