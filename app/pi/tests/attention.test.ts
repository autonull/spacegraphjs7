import { describe, expect, test } from 'vitest';
import type { RenderEdge, RenderNode } from '@spacegraphjs/renderer';
import {
    applyEdgeAttention,
    applyNodeAttention,
    attentionMapping,
    crossScopeTint,
    bundleCorridor,
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
    glow: 0.4,
    ...overrides,
});

const ribbonOf = (
    result: RenderEdge,
): { weight: number; minRadius: number; maxRadius: number; fluid: boolean; curve: number; halo: number; collar?: number; sheath?: number; color?: string } | undefined =>
    result.data?.ribbon as
        | { weight: number; minRadius: number; maxRadius: number; fluid: boolean; curve: number; halo: number; collar?: number; sheath?: number; color?: string }
        | undefined;

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
    test('a ribbon carries the palette causal color as data', () => {
        expect(ribbonOf(applyEdgeAttention(edge('writes'), 1, policy(), '#8ff0d0'))?.color).toBe(
            '#8ff0d0',
        );
        expect(ribbonOf(applyEdgeAttention(edge('writes'), 1, policy()))?.color).toBeUndefined();
    });
    test('rank and salience set ribbon weight and width', () => {
        const quiet = applyEdgeAttention(edge('writes'), 0, policy());
        const loud = applyEdgeAttention(edge('writes'), 1, policy());
        expect(ribbonOf(loud)!.weight).toBeGreaterThan(ribbonOf(quiet)!.weight);
        expect(ribbonOf(loud)!.maxRadius).toBe(2);
        expect(ribbonOf(loud)!.minRadius).toBeLessThan(ribbonOf(loud)!.maxRadius);
        expect(ribbonOf(loud)!.fluid).toBe(true);
        expect(ribbonOf(loud)!.halo).toBe(0.4);
    });

    test('causal mode keeps context as thin flux filaments', () => {
        expect(ribbonOf(applyEdgeAttention(edge('writes'), 1, policy()))).toBeDefined();
        const context = ribbonOf(applyEdgeAttention(edge('contains'), 1, policy()));
        expect(context).toBeDefined();
        expect(context!.maxRadius).toBeLessThan(ribbonOf(applyEdgeAttention(edge('writes'), 1, policy()))!.maxRadius);
        expect(ribbonOf(applyEdgeAttention(edge('reads'), 1, policy()))).toBeDefined();
    });

    test('all mode includes context ribbons; none and zero width disable them', () => {
        expect(ribbonOf(applyEdgeAttention(edge('reads'), 1, policy({ ribbonKinds: 'all' })))).toBeDefined();
        expect(ribbonOf(applyEdgeAttention(edge('writes'), 1, policy({ ribbonKinds: 'none' })))).toBeUndefined();
        expect(ribbonOf(applyEdgeAttention(edge('writes'), 1, policy({ ribbonWidth: 0 })))).toBeUndefined();
    });

    test('continuity makes the bend elastic and adds collar and sheath from salience', () => {
        const plain = ribbonOf(applyEdgeAttention(edge('writes'), 1, policy()))!;
        const quiet = ribbonOf(applyEdgeAttention(edge('writes'), 0, policy(), undefined, true))!;
        const loud = ribbonOf(applyEdgeAttention(edge('writes'), 1, policy(), undefined, true))!;
        expect(loud.collar).toBeCloseTo(0.9);
        expect(loud.sheath).toBeCloseTo(0.6);
        expect(loud.curve).toBeGreaterThan(quiet.curve);
        expect(quiet.curve).toBeLessThan(plain.curve);
        expect(ribbonOf(applyEdgeAttention(edge('reads'), 1, policy(), undefined, true))!.collar).toBeCloseTo(0.5);
    });

    test('context edges stay thin and dim', () => {
        expect(applyEdgeAttention(edge('reads'), 1, policy()).confidence).toBe('inferred');
        expect(applyEdgeAttention(edge('writes'), 1, policy()).confidence).toBe('explicit');
    });

    test('a cross-scope causal ribbon keeps the relation and takes a stable source tint', () => {
        const colors = ['#111111', '#222222'];
        const causal = applyEdgeAttention(edge('orders'), 1, policy(), '#8ff0d0');
        const tinted = crossScopeTint(causal, 'run/unit-1', 'run/unit-2', colors);
        expect(ribbonOf(tinted)?.color).toBe(colors[0]);
        expect(tinted.data?.crossScope).toBe('run/unit-1');
        expect(ribbonOf(tinted)?.fluid).toBe(true);
        expect(crossScopeTint(causal, 'run/unit-1', 'run/unit-1', colors)).toBe(causal);
        expect(crossScopeTint(causal, undefined, 'run/unit-2', colors)).toBe(causal);
        const context = edge('contains');
        expect(crossScopeTint(context, 'run/unit-1', 'run/unit-2', colors)).toBe(context);
    });

    test('a corridor bundle is opaque ribbon data on cross-scope edges only', () => {
        const colors = ['#111111', '#222222'];
        const causal = applyEdgeAttention(edge('orders'), 1, policy(), '#8ff0d0');
        const tinted = crossScopeTint(causal, 'run/unit-1', 'run/unit-2', colors);
        const positionOf = (id: string) => (id === 'a' ? { x: 0, y: 0, z: 0 } : { x: 100, y: 0, z: 0 });
        const bundled = bundleCorridor(tinted, 240, positionOf);
        const path = (bundled.data?.ribbon as { path?: unknown }).path as { x: number; y: number }[];
        expect(path).toHaveLength(3);
        expect(path.every((point) => point.y === 240)).toBe(true);
        expect(ribbonOf(bundled)?.color).toBe(ribbonOf(tinted)?.color);
        expect(bundleCorridor(causal, 240, positionOf)).toBe(causal);
    });
});
