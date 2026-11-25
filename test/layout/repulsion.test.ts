import { describe, expect, it } from 'vitest';
import { repulsionForce } from '../../src/layout/repulsion';
describe('repulsionForce', () => {
    it('caps inverse-square force at the minimum distance and the maximum', () => {
        expect(repulsionForce(100, 100, 5, 10)).toBeCloseTo(1);
        expect(repulsionForce(4, 100, 5, 10)).toBe(4);
        expect(repulsionForce(0.01, 100, 5, 10)).toBe(4);
    });
});
