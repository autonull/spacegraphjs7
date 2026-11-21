// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    POLICY_EXPERIMENTS,
    POLICY_SCHEMA,
    cellFromPolicy,
    experimentById,
    sampleExperiment,
} from '../src/policy';

describe('policy experiments', () => {
    it('samples any policy families into seeded, launchable cells', () => {
        const experiment = experimentById('bands-x-surface')!;
        const sampled = sampleExperiment(POLICY_SCHEMA, experiment);
        expect(sampled.matrix.axes).toEqual(['bands.overviewMax', 'bands.detailMin', 'surface.mode']);
        expect(sampled.matrix.strategy).toBe('sampled');
        expect(sampled.cells.length).toBe(experiment.maxCells);
        for (const cell of sampled.cells) {
            expect(cell.policy.startsWith('p1.')).toBe(true);
            expect(cellFromPolicy(POLICY_SCHEMA, cell.policy)).toEqual(cell.vector);
        }
        const again = sampleExperiment(POLICY_SCHEMA, experiment);
        expect(again.cells.map((cell) => cell.id)).toEqual(sampled.cells.map((cell) => cell.id));
    });

    it('declares metrics and a stop rule instead of auto-promoting a winner', () => {
        for (const experiment of POLICY_EXPERIMENTS) {
            expect(experiment.metrics.length).toBeGreaterThan(1);
            expect(experiment.decisionRule).toMatch(/human decision/i);
            expect(experiment.decisionRule).toMatch(/negative results/i);
        }
    });
});
