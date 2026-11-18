// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEPTH_AXES, DEFAULT_DEPTH_CONTINUUM, blendDepth, sampleDepth } from 'spacegraphjs/depth';

describe('depth continuum (P4.3)', () => {
    it('declares host-selectable depth axes with none as the baseline', () => {
        expect(DEPTH_AXES).toEqual(['none', 'lane', 'turn', 'hierarchy']);
        expect(DEFAULT_DEPTH_CONTINUUM.axis).toBe('none');
    });

    it('blends mode treatments while keeping the endpoints exact', () => {
        const flat = blendDepth('flat', 'orbit', 0);
        const orbit = blendDepth('flat', 'orbit', 1);
        const middle = blendDepth('flat', 'orbit', 0.5);
        expect(flat.phi).toBeCloseTo(Math.PI / 2);
        expect(orbit.phi).toBeCloseTo(Math.PI / 2 - 0.5);
        expect(middle.phi).toBeCloseTo((flat.phi + orbit.phi) / 2);
        expect(middle.projection).toBe('perspective');
    });

    it('offsets nodes by the host axis and attenuates opacity with depth', () => {
        const continuum = {
            mode: 'layered' as const,
            axis: 'lane' as const,
            strength: 1,
            spread: 1,
        };
        const near = sampleDepth(continuum, 0, 2);
        const far = sampleDepth(continuum, 1, 2);
        expect(near.offset).toBeCloseTo(-1);
        expect(far.offset).toBeCloseTo(1);
        expect(far.opacity).toBeLessThan(near.opacity);
        expect(sampleDepth(DEFAULT_DEPTH_CONTINUUM, 1, 2).offset).toBe(0);
    });
});
