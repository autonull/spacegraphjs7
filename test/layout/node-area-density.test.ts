import { describe, expect, it } from 'vitest';
import { solveNodeAreaDensity } from '../../src/layout';

const viewport = { width: 1600, height: 900 };
const nodes = [
    { width: 128, height: 58 },
    { width: 64, height: 29 },
    { width: 16, height: 16 },
];

describe('node-area density', () => {
    it('returns one uniform scale, preserving every node-to-node proportion', () => {
        const result = solveNodeAreaDensity({ nodes, viewport, nodesAreaDensity: 0.2 });
        expect(result.scale).toBeGreaterThan(1);
        expect(result.measured).toBeLessThanOrEqual(0.2);
    });

    it('approximates a reachable target monotonically and reports its passes', () => {
        const sparse = solveNodeAreaDensity({ nodes, viewport, nodesAreaDensity: 0.02, maxScale: 5 });
        const dense = solveNodeAreaDensity({ nodes, viewport, nodesAreaDensity: 0.08, maxScale: 5 });
        expect(dense.scale).toBeGreaterThan(sparse.scale);
        expect(dense.measured).toBeGreaterThan(sparse.measured);
        expect(dense.passes).toBeGreaterThan(0);
        expect(dense.measured).toBeCloseTo(0.08, 2);
    });

    it('honours the scale bound and the coverage clamp', () => {
        const result = solveNodeAreaDensity({ nodes, viewport, nodesAreaDensity: 0.9, maxScale: 2 });
        expect(result.scale).toBe(2);
        expect(result.measured).toBeLessThanOrEqual(0.9);
        const empty = solveNodeAreaDensity({ nodes: [], viewport, nodesAreaDensity: 0.5 });
        expect(empty).toMatchObject({ scale: 1, measured: 0, passes: 0 });
    });
});
