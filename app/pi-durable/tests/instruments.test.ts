import { describe, expect, it } from 'vitest';
import { instrumentsFor, tally } from '../src/instruments';

describe('instrument panel data', () => {
    it('tallies bands and edge kinds', () => {
        expect(tally(['card', 'dot', 'card'])).toEqual({ card: 2, dot: 1 });
        const panel = instrumentsFor({
            bands: ['card', 'dot', 'card'],
            weights: { a: 0.7, b: 0.2 },
            edgeKinds: ['orders', 'orders', 'owns'],
            omitted: 3,
        });
        expect(panel.octaves).toEqual({ card: 2, dot: 1 });
        expect(panel.edgeKinds).toEqual({ orders: 2, owns: 1 });
        expect(panel.weights).toEqual({ a: 0.7, b: 0.2 });
        expect(panel.omitted).toBe(3);
    });

    it('counts sum to the rendered model size without hidden state', () => {
        const panel = instrumentsFor({
            bands: ['dot', 'chip', 'panel'],
            weights: { a: 1, b: 0.5, c: 0 },
            edgeKinds: ['orders', 'sleeps-on'],
            omitted: 0,
        });
        expect(Object.values(panel.octaves).reduce((sum, count) => sum + count, 0)).toBe(3);
        expect(Object.keys(panel.weights)).toHaveLength(3);
        expect(Object.values(panel.edgeKinds).reduce((sum, count) => sum + count, 0)).toBe(2);
    });
});
