import type { Edge, Hyperedge, Node } from './kernel';

export const node = (id: string, label = id, kind = 'node'): Node => ({ id, kind, label });

export const edge = (id: string, source: string, target: string, kind = 'edge'): Edge => ({
    id,
    kind,
    source,
    target,
});

export const hyperedge = (id: string, nodes: string[]): Hyperedge => ({ id, kind: 'hyperedge', nodes });
