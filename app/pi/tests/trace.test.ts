import { describe, expect, test } from 'vitest';
import { agentDomain } from '@spacegraphjs/agent';
import { fixtureKernel } from '../src/fixture';
import { traceOrder } from '../src/trace';

const view = agentDomain.build(fixtureKernel());

describe('trace order', () => {
    test('starts at the requested node and visits each provenance neighbour once', () => {
        const start = view.nodes[0].id;
        const order = traceOrder(view, start);
        expect(order[0]).toBe(start);
        expect(new Set(order).size).toBe(order.length);
        expect(order.length).toBeGreaterThan(0);
        for (const id of order) expect(view.nodes.some((node) => node.id === id)).toBe(true);
    });

    test('returns nothing for an unknown node', () => {
        expect(traceOrder(view, 'not-a-node')).toEqual([]);
    });
});
