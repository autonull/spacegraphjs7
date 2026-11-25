// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { edgePath } from '../../src/navigation';

const model = {
    nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
    edges: [
        { source: 'a', target: 'b', kind: 'orders' },
        { source: 'b', target: 'c', kind: 'orders' },
        { source: 'c', target: 'a', kind: 'orders' },
        { source: 'a', target: 'd', kind: 'owns' },
        { source: 'c', target: 'missing', kind: 'orders' },
    ],
};

describe('edgePath', () => {
    it('walks only the requested kinds in breadth-first order and visits cycles once', () => {
        expect(edgePath(model, 'a', { kinds: ['orders'] }).map((step) => step.id)).toEqual(['b', 'c']);
        expect(edgePath(model, 'a', { kinds: ['orders'] })).toEqual([
            { id: 'b', via: 'a', kind: 'orders', forward: true },
            { id: 'c', via: 'b', kind: 'orders', forward: true },
        ]);
    });

    it('traverses both directions when undirected and records the direction', () => {
        expect(edgePath(model, 'c', { kinds: ['orders'], directed: false })).toEqual([
            { id: 'b', via: 'c', kind: 'orders', forward: false },
            { id: 'a', via: 'c', kind: 'orders', forward: true },
        ]);
    });

    it('follows every kind by default and ignores a missing start', () => {
        expect(edgePath(model, 'a').map((step) => step.id)).toEqual(['b', 'd', 'c']);
        expect(edgePath(model, 'missing')).toEqual([]);
    });
});
