import type { GraphViewData, GraphNode } from './types';

/**
 * Finds a node by ID in the graph model.
 */
export function nodeByID(model: GraphViewData, id: string): GraphNode | undefined {
    return model.nodes.find((node) => node.id === id);
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
