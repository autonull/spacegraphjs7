import type { PolicyExperiment, PolicySchema, PolicyVector } from 'spacegraphjs/policy';
import { decodePolicyVector } from './resolve';
export {
    sampleExperiment,
    type PolicyExperiment,
    type ExperimentCell,
    type SampledExperiment,
} from 'spacegraphjs/policy';

export const cellFromPolicy = (schema: PolicySchema, policy: string): PolicyVector | undefined =>
    decodePolicyVector(schema, policy) ?? undefined;

export const POLICY_EXPERIMENTS: readonly PolicyExperiment[] = [
    {
        id: 'bands-x-surface',
        title: 'Does band placement depend on the surface?',
        families: ['bands', 'surface'],
        variants: {
            'bands.overviewMax': [0.45, 0.3],
            'bands.detailMin': [1.8, 2.4],
            'surface.mode': ['hybrid', 'map', 'log'],
        },
        seed: 7,
        maxCells: 8,
        metrics: ['success', 'timeMs', 'preference', 'legibility', 'travel'],
        decisionRule:
            'Graduate a variant only if it beats the incumbent on task success and time without a preference penalty, with the comparison recorded and a human decision logged. Negative results publish verbatim.',
    },
    {
        id: 'quiet-cockpit',
        title: 'Do fewer aids and shorter flights hurt the five tasks?',
        families: ['camera', 'emphasis', 'navigation'],
        variants: {
            'camera.verbMs': [900, 250],
            'emphasis.cap': [1, 0.6],
            'navigation.minimap': [true, false],
        },
        seed: 11,
        maxCells: 10,
        metrics: ['success', 'timeMs', 'wrongTurns', 'escapeHatch'],
        decisionRule:
            'A variant graduates only with a recorded comparison and a human decision; negative results publish verbatim.',
    },
    {
        id: 'geometry-x-depth',
        title: 'Does spacing and depth change spatial legibility?',
        families: ['geometry', 'depth'],
        variants: {
            'geometry.gap': [190, 500],
            'geometry.padding': [36, 160],
            'geometry.repulsion': [1800, 6000],
            'depth.step': [220, 400],
            'depth.mode': ['orbit', 'flat'],
        },
        seed: 13,
        maxCells: 8,
        metrics: ['legibility', 'success', 'travel'],
        decisionRule:
            'Offline replay re-simulates the fixture under each cell. A variant graduates only after a recorded comparison and a human decision; negative results publish verbatim.',
    },
];

export const experimentById = (id: string): PolicyExperiment | undefined =>
    POLICY_EXPERIMENTS.find((experiment) => experiment.id === id);
