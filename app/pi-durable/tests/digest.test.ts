import { addEdge, addNode, SessionKernel, type KernelOp } from '@spacegraphjs/kernel';
import { describe, expect, it } from 'vitest';
import { digestKernels } from '../src/digest';

const folded = (ops: readonly KernelOp[]) =>
    new SessionKernel({ entries: ops.map((op, index) => ({ id: `e${index}`, op })) }).state();

describe('change digest', () => {
    it('reports added nodes and new links from the two kernels only', () => {
        const before = folded([
            addNode('a', 'message', 'A', {}),
            addNode('b', 'message', 'B', {}),
        ]);
        const after = folded([
            addNode('a', 'message', 'A', {}),
            addNode('b', 'message', 'B', {}),
            addEdge('orders', 'a', 'b'),
        ]);
        const digest = digestKernels(before, after, 1);
        expect(digest.since).toBe(1);
        expect(digest.added).toEqual([]);
        expect(digest.removed).toEqual([]);
        expect(digest.edgesAdded).toBe(1);
        expect(digest.summary).toContain('since 1');
        expect(digest.summary).toContain('1 new links');
    });

    it('reports removals and invents no edge kind', () => {
        const before = folded([
            addNode('a', 'message', 'A', {}),
            addNode('b', 'message', 'B', {}),
            addEdge('orders', 'a', 'b'),
        ]);
        const after = folded([addNode('a', 'message', 'A', {})]);
        const digest = digestKernels(before, after, 2);
        expect(digest.added).toEqual([]);
        expect(digest.removed).toEqual(['b']);
        expect(digest.edgesRemoved).toBe(1);
        expect(digest.summary).toContain('−1 facts');
    });

    it('keeps ids in the order the after and before kernels record them', () => {
        const before = folded([]);
        const after = folded([
            addNode('z', 'message', 'Z', {}),
            addNode('a', 'message', 'A', {}),
        ]);
        expect(digestKernels(before, after, 1).added).toEqual(['z', 'a']);
    });
});
