import { describe, expect, test } from 'vitest';
import { Kernel } from './kernel';
import { deriveScope } from './scope';
import { edge, node } from './test-helpers';

const kernel = new Kernel({
    nodes: [
        node('a', 'a', 'keep'),
        node('b', 'b', 'drop'),
        node('c', 'c', 'keep'),
        node('pinned', 'pinned', 'drop'),
    ],
    edges: [edge('e1', 'a', 'b'), edge('e2', 'a', 'c'), edge('e3', 'b', 'pinned')],
    hyperedges: [],
});

describe('deriveScope', () => {
    test('keeps nodes matching the predicate', () => {
        const scoped = deriveScope(kernel, (item) => item.kind === 'keep');

        expect(scoped.nodes.map((item) => item.id)).toEqual(['a', 'c']);
        expect(scoped.edges.map((item) => item.id)).toEqual(['e2']);
    });

    test('keeps pinned nodes even when the predicate drops them', () => {
        const scoped = deriveScope(kernel, (item) => item.kind === 'keep', ['pinned']);

        expect(scoped.nodes.map((item) => item.id)).toEqual(['a', 'c', 'pinned']);
        expect(scoped.edges.map((item) => item.id)).toEqual(['e2']);
    });

    test('keeps internal edges when a pinned node reconnects', () => {
        const scoped = deriveScope(kernel, (item) => item.kind === 'keep', ['b']);

        expect(scoped.nodes.map((item) => item.id)).toEqual(['a', 'b', 'c']);
        expect(scoped.edges.map((item) => item.id)).toEqual(['e1', 'e2']);
    });
});
