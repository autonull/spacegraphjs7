// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MathPool, withPooledVectors } from '../src/core';
import { ribbonWidth } from '../src/utils/ribbon';

describe('ribbonWidth', () => {
    it('keeps the original numeric formula', () => {
        expect(ribbonWidth({ weight: 0 })).toBe(1);
        expect(ribbonWidth({ weight: 0.5 })).toBe(4.5);
        expect(ribbonWidth({ weight: 1 })).toBe(8);
        expect(ribbonWidth({})).toBe(4.5);
    });

    it('accepts numeric strings, a direct width and a radius tuple', () => {
        expect(ribbonWidth({ weight: '0.5' })).toBe(4.5);
        expect(ribbonWidth({ width: 12 })).toBe(12);
        expect(ribbonWidth({ radius: [2, 6], weight: 0.5 })).toBe(4);
    });

    it('falls back instead of emitting NaN geometry', () => {
        expect(ribbonWidth({ weight: Number.NaN })).toBe(4.5);
        expect(ribbonWidth({ weight: 'nope' })).toBe(4.5);
        expect(ribbonWidth({ minRadius: Number.NaN, maxRadius: Number.NaN })).toBe(4.5);
    });

    it('supports named width curves', () => {
        expect(ribbonWidth({ weight: 0.25 })).toBe(2.75);
        expect(ribbonWidth({ weight: 0.25, widthCurve: 'sqrt' })).toBe(4.5);
        expect(ribbonWidth({ weight: 0.25, widthCurve: 'smoothstep' })).toBeCloseTo(2.09, 2);
    });
});

describe('withPooledVectors', () => {
    it('supplies N vectors and returns every one on normal exit', () => {
        const pool = MathPool.getInstance();
        const before = pool.vector3Pool.available.length;
        const result = withPooledVectors(pool, 3, (a, b, c) => {
            expect(a.isVector3 && b.isVector3 && c.isVector3).toBe(true);
            a.set(1, 2, 3);
            return a.length();
        });
        expect(result).toBeCloseTo(Math.sqrt(14));
        expect(pool.vector3Pool.available.length).toBe(before);
    });

    it('releases acquired vectors on early exit and on throw', () => {
        const pool = MathPool.getInstance();
        const before = pool.vector3Pool.available.length;
        withPooledVectors(pool, 6, () => undefined);
        expect(pool.vector3Pool.available.length).toBe(before);
        expect(() =>
            withPooledVectors(pool, 4, () => {
                throw new Error('boom');
            }),
        ).toThrow('boom');
        expect(pool.vector3Pool.available.length).toBe(before);
    });
});
