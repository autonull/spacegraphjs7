import { describe, expect, it } from 'vitest';
import type { RendererCapabilities, RenderModel } from '@spacegraphjs/renderer';
import { supportsEmphasis } from '@spacegraphjs/renderer';
import {
    applyEmphasis,
    applyModelEmphasis,
    centralitySignal,
    createSalience,
    kindSignal,
    mappingFor,
    recencySignal,
    statusSignal,
} from 'spacegraphjs/salience';

const model: RenderModel = {
    nodes: [
        { id: 'a', kind: 'session', label: 'A', position: [0, 0, 0], size: [100, 50, 0], status: 'running' },
        { id: 'b', kind: 'tool', label: 'B', position: [10, 0, 0], size: [80, 30, 0] },
    ],
    edges: [{ id: 'e', source: 'a', target: 'b', kind: 'causal' }],
};

const capabilities: RendererCapabilities = {
    projections: ['2d'],
    depths: ['flat'],
    domNodes: false,
    maxDomNodes: 0,
    edgeLabels: false,
    clusterNodes: false,
    minimap: false,
    maxRecommendedNodes: 100,
    emphasis: ['size'],
};

describe('salience (P2.1)', () => {
    it('returns a uniform zero map and no reasons with no signals', () => {
        const result = createSalience([])({ model, now: 0 });
        expect([...result.values.values()]).toEqual([0, 0]);
        expect(result.explain('a')).toEqual([]);
    });

    it('composes weighted signals deterministically and explains the score', () => {
        const score = createSalience([kindSignal({ session: 1, tool: 0 }, 2), centralitySignal()]);
        const result = score({ model, now: 0 });
        expect(result.values.get('a')).toBe(1);
        expect(result.values.get('b')).toBeCloseTo(1 / 3);
        expect(result.explain('a')).toEqual([
            { signal: 'kind', label: 'node kind', weight: 2, value: 1, contribution: 2 / 3 },
            {
                signal: 'centrality',
                label: 'graph centrality',
                weight: 1,
                value: 1,
                contribution: 1 / 3,
            },
        ]);
        expect(score({ model, now: 0 }).values).toEqual(result.values);
    });

    it('lets two hosts supply different signal sets and get different maps', () => {
        const byKind = createSalience([kindSignal({ session: 1, tool: 0 })]);
        const byStatus = createSalience([statusSignal({ running: 1 })]);
        const kind = byKind({ model, now: 0 }).values;
        const status = byStatus({ model, now: 0 }).values;
        expect(kind.get('a')).toBe(1);
        expect(kind.get('b')).toBe(0);
        expect(status.get('a')).toBe(1);
        expect(status.get('b')).toBe(0);
        expect(createSalience([kindSignal({ tool: 1 })])({ model, now: 0 }).values.get('a')).toBe(0);
    });

    it('reads decay from the supplied clock rather than the wall clock', () => {
        const score = createSalience([recencySignal({ a: 1_000 }, 1_000)]);
        expect(score({ model, now: 1_000 }).values.get('a')).toBe(1);
        expect(score({ model, now: 2_000 }).values.get('a')).toBe(0.5);
        expect(score({ model, now: 3_000 }).values.get('a')).toBe(0.25);
    });
});

describe('emphasis channels (P2.2/P2.3)', () => {
    it('maps only the channels a host names', () => {
        const node = applyEmphasis(model.nodes[0]!, 0.5, mappingFor(['size', 'glow'], { size: [1, 2] }));
        expect(node.size).toEqual([150, 75, 0]);
        expect(node.data?.glow).toBe(0.5);
        expect(node.data?.lift).toBeUndefined();
        expect(node.emphasis).toBe(0.5);
    });

    it('keeps ids and positions and gives edges the louder endpoint', () => {
        const mapping = mappingFor(['size', 'edgeThickness'], { size: [1, 2] });
        const result = applyModelEmphasis(model, new Map([['a', 1], ['b', 0.5]]), mapping);
        expect(result.nodes.map((node) => node.id)).toEqual(['a', 'b']);
        expect(result.nodes[1]?.position).toEqual([10, 0, 0]);
        expect(result.edges[0]?.emphasis).toBe(1);
        expect(result.edges[0]?.data?.thickness).toBe(4);
    });

    it('gates channels through the renderer capability flag', () => {
        expect(supportsEmphasis(capabilities, 'size')).toBe(true);
        expect(supportsEmphasis(capabilities, 'glow')).toBe(false);
        expect(supportsEmphasis({ ...capabilities, emphasis: undefined }, 'size')).toBe(false);
    });
});
