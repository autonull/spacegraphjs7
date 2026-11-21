import { describe, expect, it } from 'vitest';
import { DEFAULT_THRESHOLDS, representationLayers } from 'spacegraphjs/salience';

const thresholds = { ...DEFAULT_THRESHOLDS, demoteBelow: 0.4 };

describe('representation layers', () => {
    it('returns one layer at rest', () => {
        expect(
            representationLayers({ level: 'overview', activity: 0.1, legibility: 1 }, thresholds),
        ).toEqual([{ rung: 'overview', opacity: 1 }]);
        expect(
            representationLayers({ level: 'detail', activity: 0, legibility: 0.9 }, thresholds),
        ).toEqual([{ rung: 'detail', opacity: 1 }]);
    });

    it('returns two neighbouring layers with normalized opacity at a boundary', () => {
        const layers = representationLayers(
            { level: 'overview', activity: 0.55, legibility: 1 },
            thresholds,
            0.2,
        );
        expect(layers.map((layer) => layer.rung)).toEqual(['overview', 'execution']);
        expect(layers.reduce((sum, layer) => sum + layer.opacity, 0)).toBeCloseTo(1);
        expect(layers[0]!.opacity).toBeGreaterThan(0);
        expect(layers[1]!.opacity).toBeGreaterThan(0);
    });

    it('never mixes the two outer rungs', () => {
        for (const legibility of [0, 0.2, 0.39, 0.41, 0.6, 1]) {
            const layers = representationLayers(
                { level: 'detail', activity: 0, legibility },
                thresholds,
                0.3,
            );
            const rungs = layers.map((layer) => layer.rung);
            expect(rungs.includes('overview') && rungs.includes('detail')).toBe(false);
            expect(layers.length).toBeLessThanOrEqual(2);
        }
    });

    it('drops a negligible neighbour and renormalizes', () => {
        const layers = representationLayers(
            { level: 'detail', activity: 0, legibility: 0.41 },
            thresholds,
            0.2,
            0.5,
        );
        expect(layers).toEqual([{ rung: 'detail', opacity: 1 }]);
    });
});
