import { addEdge, addNode, SessionKernel, type KernelOp } from '@spacegraphjs/kernel';
import { describe, expect, it } from 'vitest';
import { calloutsFor } from '../src/callouts';
import { focusLens } from '../src/focus';
import { filterCounts, matchesFilter } from '../src/filters';
import { threadFrom } from '../src/thread';

const kernel = () => new SessionKernel({
    entries: ([
        addNode('a', 'message', 'A', {}),
        addNode('b', 'message', 'B', {}),
        addNode('c', 'message', 'C', {}),
        addEdge('orders', 'a', 'b'),
        addEdge('orders', 'b', 'c'),
        addEdge('owns', 'a', 'c'),
    ] as readonly KernelOp[]).map((op, index) => ({ id: `e${index}`, op })),
}).state();

describe('follow thread', () => {
    it('walks only recorded order edges in stable order', () => {
        const steps = threadFrom(kernel(), 'a');
        expect(steps.map((step) => step.id)).toEqual(['b', 'c']);
        expect(new Set(steps.map((step) => step.kind))).toEqual(new Set(['orders']));
        expect(steps.every((step) => kernel().nodes.some((node) => node.id === step.id))).toBe(true);
        expect(threadFrom(kernel(), 'missing')).toEqual([]);
    });
});

describe('focus lens', () => {
    it('drops octaves and mutes non-neighbours without changing ids', () => {
        const octaves = new Map([['a', 4], ['b', 3]]);
        const weights = new Map([['a', 0.5], ['b', 0.5]]);
        const lens = focusLens(octaves, weights, new Set(['a']));
        expect([...lens.octaves.keys()]).toEqual(['a', 'b']);
        expect(lens.octaves.get('a')).toBe(4);
        expect(lens.octaves.get('b')).toBe(1.5);
        expect(lens.weights.get('a')).toBeGreaterThan(0.5);
        expect(lens.weights.get('b')).toBeLessThan(0.5);
        expect([...lens.muted]).toEqual(['b']);
    });
});

describe('curiosity callouts', () => {
    it('counts committed facts only', () => {
        const callouts = calloutsFor([
            { kind: 'pending', status: 'sleeping', data: {} },
            { kind: 'pending', status: 'complete', data: {} },
            { kind: 'config', status: 'complete', data: { deferred: true } },
            { kind: 'state', status: 'complete', data: { trace: {} } },
            { kind: 'message', status: 'complete', data: {} },
        ]);
        expect(callouts.map((callout) => [callout.id, callout.count])).toEqual([
            ['signals', 1], ['docs', 1], ['spans', 1],
        ]);
        expect(callouts.map((callout) => callout.view)).toEqual(['tasks', 'docs', 'trace']);
    });
});

describe('muting filters', () => {
    it('dims non-matches without changing the fold', () => {
        const nodes = [
            { kind: 'message', status: 'complete' },
            { kind: 'task', status: 'sleeping' },
            { kind: 'message', status: 'sleeping' },
        ];
        const filter = { kinds: ['message'], statuses: [] };
        expect(matchesFilter(nodes[0]!, filter)).toBe(true);
        expect(matchesFilter(nodes[1]!, filter)).toBe(false);
        const counts = filterCounts(nodes, filter);
        expect(counts.total).toBe(3);
        expect(counts.matching).toBe(2);
        expect(counts.kinds).toEqual({ message: 2, task: 1 });
        expect(counts.statuses).toEqual({ complete: 1, sleeping: 2 });
    });
});
