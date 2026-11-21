import { describe, expect, test } from 'bun:test';
import { addEdge, addNode, foldKernelOps } from './domain';
import { Kernel } from './kernel';
import type { KernelOp } from './session';

describe('domain op factories', () => {
    test('build add-node and add-edge ops with stable ids', () => {
        expect(addNode('a', 'kind', 'A', { n: 1 })).toEqual({
            op: 'add-node',
            node: { id: 'a', kind: 'kind', label: 'A', data: { n: 1 } },
        });
        expect(addEdge('contains', 'a', 'b')).toEqual({
            op: 'add-edge',
            edge: { id: 'contains:a:b', kind: 'contains', source: 'a', target: 'b' },
        });
    });
});

describe('foldKernelOps', () => {
    const ops: KernelOp[] = [
        addNode('a', 'kind', 'A', {}),
        addNode('b', 'kind', 'B', {}),
        addEdge('contains', 'a', 'b'),
    ];

    test('folds adds and advances the version once per op', () => {
        const kernel = foldKernelOps(ops);
        expect(kernel.nodes.map((node) => node.id)).toEqual(['a', 'b']);
        expect(kernel.edges.map((edge) => edge.id)).toEqual(['contains:a:b']);
        expect(kernel.version).toBe(3);
    });

    test('applies removals and preserves entries in the base kernel', () => {
        const base = foldKernelOps(ops);
        const next = foldKernelOps(
            [
                { op: 'remove-node', id: 'a' },
                { op: 'remove-edge', id: 'contains:a:b' },
            ],
            base,
        );
        expect(next.nodes.map((node) => node.id)).toEqual(['b']);
        expect(next.edges).toEqual([]);
        expect(next.version).toBe(5);
    });

    test('folds hyperedges from an empty base', () => {
        const hyperedge = { id: 'h', nodes: ['a', 'b'], kind: 'group' };
        const kernel = foldKernelOps([{ op: 'add-hyperedge', hyperedge }]);
        expect(kernel.hyperedges).toEqual([hyperedge]);
        expect(new Kernel().hyperedges).toEqual([]);
    });
});
