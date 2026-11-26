import type { GraphViewData, GraphNode } from './types';

/**
 * Finds a node by ID in the graph model.
 */
export function nodeByID(model: GraphViewData, id: string): GraphNode | undefined {
    return model.nodes.find((node) => node.id === id);
}

/** Tone of a unified diff line. */
export type DiffTone = 'header' | 'added' | 'removed' | 'context';

/** Formats a duration as a compact relative age string. */
export function formatAge(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}

/** Returns the tone of a unified diff line. */
export function diffTone(line: string): DiffTone {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) return 'header';
    if (line.startsWith('+')) return 'added';
    if (line.startsWith('-')) return 'removed';
    return 'context';
}
