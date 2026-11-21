import { describe, expect, test } from 'vitest';
import type { RenderEdge, RenderNode } from '@spacegraphjs/renderer';
import {
    applyEdgeAttention,
    applyNodeAttention,
    attentionMapping,
    edgeRank,
    salienceScore,
    type AttentionPolicy,
} from '../src/attention';

const edge = (kind: string): RenderEdge => ({
    id: `e-${kind}`,
    source: 'a',
    target: 'b',
    kind,
    confidence: 'explicit',
});

const node = (): RenderNode => ({ id: 'a', kind: 'unit', label: 'A', position: [0, 0, 0] });

const policy = (overrides: Partial<AttentionPolicy> = {}): AttentionPolicy => ({
    salienceSize: 1.15,
    ribbonWidth: 2,
    ribbonKinds: 'causal',
    ...overrides,
});

const ribbonOf = (
    result: RenderEdge,
): { weight: number; minRadius: number; maxRadius: number } | undefined =>
    result.data?.ribbon as { weight: number; minRadius: number; maxRadius: number } | undefined;

describe('salience ranking', () => {
    test('causal flow outranks containment and context', () => {
        expect(edgeRank('writes')).toBeGreaterThan(edgeRank('contains'));
        expect(edgeRank('contains')).toBeGreaterThan(edgeRank('reads'));
        expect(edgeRank('unknown')).toBeLessThan(edgeRank('reads'));
    });

    test('score is clamped and uses the louder of activity and emphasis', () => {
        expect(salienceScore(-1, 0)).toBe(0);
        expect(salienceScore(0.4, 0.9)).toBe(0.9);
        expect(salienceScore(2)).toBe(1);
    });

    test('size stays within the policy bound and focus scale multiplies it', () => {
        const quiet = applyNodeAttention(node(), [200, 80], 0, policy());
        const loud = applyNodeAttention(node(), [200, 80], 1, policy());
        expect(quiet.size![0]).toBe(200);
        expect(loud.size![0]).toBeCloseTo(230);
        const focused = applyNodeAttention(node(), [200, 80], 1, policy({ salienceSize: 3 }), 1.6);
        expect(focused.size![0]).toBeCloseTo(960);
    });

    test('mapping reuses the salience vocabulary with bounded ranges', () => {
        const mapping = attentionMapping(1.15);
        expect(mapping.size).toEqual([1, 1.15]);
        expect(mapping.opacity).toEqual([0.78, 1]);
    });
});

describe('ribbon grammar', () => {
    test('rank and salience set ribbon weight and width', () => {
        const quiet = applyEdgeAttention(edge('writes'), 0, policy());
        const loud = applyEdgeAttention(edge('writes'), 1, policy());
        expect(ribbonOf(loud)!.weight).toBeGreaterThan(ribbonOf(quiet)!.weight);
        expect(ribbonOf(loud)!.maxRadius).toBe(2);
        expect(ribbonOf(loud)!.minRadius).toBeCloseTo(0.7);
    });

    test('causal mode excludes containment and context', () => {
        expect(ribbonOf(applyEdgeAttention(edge('writes'), 1, policy()))).toBeDefined();
        expect(ribbonOf(applyEdgeAttention(edge('contains'), 1, policy()))).toBeUndefined();
        expect(ribbonOf(applyEdgeAttention(edge('reads'), 1, policy()))).toBeUndefined();
    });

    test('all mode includes context ribbons; none and zero width disable them', () => {
        expect(ribbonOf(applyEdgeAttention(edge('reads'), 1, policy({ ribbonKinds: 'all' })))).toBeDefined();
        expect(ribbonOf(applyEdgeAttention(edge('writes'), 1, policy({ ribbonKinds: 'none' })))).toBeUndefined();
        expect(ribbonOf(applyEdgeAttention(edge('writes'), 1, policy({ ribbonWidth: 0 })))).toBeUndefined();
    });

    test('context edges stay thin and dim', () => {
        expect(applyEdgeAttention(edge('reads'), 1, policy()).confidence).toBe('inferred');
        expect(applyEdgeAttention(edge('writes'), 1, policy()).confidence).toBe('explicit');
    });
});
