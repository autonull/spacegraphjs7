import { describe, expect, test } from 'vitest';
import { buildCatalog } from '../src/catalog';
import {
    POLICY_EXPERIMENTS,
    POLICY_PRESETS,
    POLICY_SCHEMA,
    decodePolicyVector,
    presetVector,
    sampleExperiment,
} from '../src/policy';
import { STUDY_TASKS } from '../src/study';

describe('public catalog', () => {
    const catalog = buildCatalog(POLICY_SCHEMA);

    test('lists every preset as a launchable link carrying its question', () => {
        expect(catalog.presets).toHaveLength(POLICY_PRESETS.length);
        for (const [index, entry] of catalog.presets.entries()) {
            const preset = POLICY_PRESETS[index];
            expect(entry.href).toBe(`?preset=${encodeURIComponent(preset.id)}`);
            expect(entry.label).toBe(preset.title);
            expect(entry.title).toBe(preset.question);
            expect(presetVector(POLICY_SCHEMA, preset.id)).toEqual(preset.vector);
        }
    });

    test('lists the five canonical study questions exactly once each', () => {
        expect(catalog.questions.map((entry) => entry.id)).toEqual(STUDY_TASKS.map((task) => task.id));
        expect(new Set(catalog.questions.map((entry) => entry.id)).size).toBe(STUDY_TASKS.length);
        for (const [index, entry] of catalog.questions.entries()) {
            expect(entry.label).toBe(STUDY_TASKS[index].question);
            expect(entry.href).toBe(`#question-${STUDY_TASKS[index].id}`);
        }
    });

    test('lists every experiment with seeded cells that round-trip into their vector', () => {
        expect(catalog.experiments).toHaveLength(POLICY_EXPERIMENTS.length);
        for (const [index, experiment] of catalog.experiments.entries()) {
            const definition = POLICY_EXPERIMENTS[index];
            const cells = sampleExperiment(POLICY_SCHEMA, definition).cells;
            expect(experiment.id).toBe(definition.id);
            expect(experiment.rule).toContain('human decision');
            expect(experiment.cells).toHaveLength(cells.length);
            for (const [cellIndex, entry] of experiment.cells.entries()) {
                expect(entry.id).toBe(cells[cellIndex].id);
                expect(entry.label).toBe(cells[cellIndex].id);
                const policy = new URLSearchParams(entry.href).get('policy');
                expect(policy).toBeTruthy();
                expect(decodePolicyVector(POLICY_SCHEMA, policy!)).toEqual(cells[cellIndex].vector);
            }
        }
    });
});
