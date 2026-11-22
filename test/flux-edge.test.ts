import { describe, expect, it } from 'vitest';
import { fluxBrightness, fluxRadius } from '../src/edges/FluxEdge';

describe('flux connection grammar', () => {
    it('keeps the tapered tip when no collar is supplied', () => {
        expect(fluxRadius(10, 0, 0, 0, 12)).toBeCloseTo(1.6);
        expect(fluxRadius(10, 1, 0, 6, 12)).toBeCloseTo(5);
    });

    it('flattens the two trimmed ends into a square flange when a collar is supplied', () => {
        expect(fluxRadius(10, 0, 0.9, 0, 12)).toBeCloseTo(4.5);
        expect(fluxRadius(10, 0, 0.9, 12, 12)).toBeCloseTo(4.5);
        expect(fluxRadius(10, 1, 0.9, 6, 12)).toBeCloseTo(5);
    });

    it('clamps the collar and leaves the interior untouched', () => {
        expect(fluxRadius(10, 0, 2, 0, 12)).toBeCloseTo(5);
        expect(fluxRadius(10, 0, 1, 1, 12)).toBeCloseTo(1.6);
    });

    it('lights one side and shades the other without leaving the 0-1 range', () => {
        expect(fluxBrightness(0.8, 0.6, true)).toBeCloseTo(1);
        expect(fluxBrightness(0.8, 0.6, false)).toBeLessThan(0.8);
        expect(fluxBrightness(0.5, 0, true)).toBe(0.5);
        expect(fluxBrightness(1, 0, false)).toBe(1);
    });
});
