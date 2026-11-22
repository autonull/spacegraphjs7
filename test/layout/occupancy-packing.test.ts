import { describe, expect, it } from 'vitest';
import { occupancySpacingFactor, ScopeSimulation, type ScopeSpec } from '../../src/layout';

const specs: ScopeSpec[] = [
    {
        id: 'root',
        nodes: [
            { id: 'a', size: [120, 64] },
            { id: 'b', size: [120, 64] },
            { id: 'c', size: [120, 64] },
            { id: 'd', size: [120, 64] },
        ],
    },
];

const extent = (options: object): number => {
    const simulation = new ScopeSimulation({
        instant: true,
        layout: { seed: 7, gap: 160, nodePadding: 20, ...options },
    });
    simulation.setSpecs(specs);
    const xs = [...simulation.positions.values()].map((position) => position.x);
    return Math.max(...xs) - Math.min(...xs);
};

describe('occupancy-aware spacing', () => {
    it('leaves the base gap alone without a measured occupancy and target', () => {
        expect(occupancySpacingFactor()).toBe(1);
        expect(occupancySpacingFactor(0.06)).toBe(1);
        expect(occupancySpacingFactor(0.06, 0)).toBe(1);
    });

    it('tightens toward the target within a half-to-one band', () => {
        expect(occupancySpacingFactor(0.06, 0.12)).toBe(0.5);
        expect(occupancySpacingFactor(0.09, 0.12)).toBe(0.75);
        expect(occupancySpacingFactor(0.2, 0.12)).toBe(1);
    });

    it('packs the same scopes into a smaller extent', () => {
        expect(extent({ occupancy: 0.06, targetOccupancy: 0.12 })).toBeLessThan(extent({}));
    });

    it('keeps every node present when spacing tightens', () => {
        const simulation = new ScopeSimulation({
            instant: true,
            layout: { seed: 7, gap: 160, nodePadding: 20, occupancy: 0.06, targetOccupancy: 0.12 },
        });
        simulation.setSpecs(specs);
        expect(simulation.positions.size).toBe(4);
    });
});
