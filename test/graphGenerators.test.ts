import { describe, expect, it } from 'vitest';
import { randomTree, scaleFreeGraph, smallWorld } from '../src/utils/graphGenerators';

describe('seeded graph generators', () => {
    it('treats seed 0 as a real seed', () => {
        expect(randomTree(3, 2, { seed: 0 })).toEqual(randomTree(3, 2, { seed: 0 }));
        expect(scaleFreeGraph(8, { seed: 0 })).toEqual(scaleFreeGraph(8, { seed: 0 }));
        expect(smallWorld(8, 2, 0.25, { seed: 0 })).toEqual(smallWorld(8, 2, 0.25, { seed: 0 }));
    });

    it('produces different graphs for different seeds', () => {
        expect(scaleFreeGraph(8, { seed: 0 })).not.toEqual(scaleFreeGraph(8, { seed: 1 }));
    });
});
