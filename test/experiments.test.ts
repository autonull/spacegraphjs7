// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    EXPERIMENT_TEMPLATES,
    MetricsHarness,
    axisValues,
    cartesianMatrix,
    fromCounterRecord,
    hasCombination,
    reportMarkdown,
    templateById,
    type MatrixAxis,
} from 'spacegraphjs/experiments';

const axes: MatrixAxis[] = [
    { id: 'widgets', values: ['none', 'body', 'max'] },
    { id: 'lod', values: ['dot', 'card'] },
    { id: 'depth', values: ['flat', 'orbit'] },
];

describe('cartesian capture matrix (P5.1)', () => {
    it('enumerates the full product with stable ids', () => {
        const matrix = cartesianMatrix(axes);
        expect(matrix.strategy).toBe('full');
        expect(matrix.total).toBe(12);
        expect(matrix.cells).toHaveLength(12);
        expect(matrix.cells[0]?.id).toBe('widgets=none&lod=dot&depth=flat');
        expect(new Set(matrix.cells.map((cell) => cell.id)).size).toBe(12);
        expect(axisValues(matrix, 'lod')).toEqual(['dot', 'card']);
    });

    it('samples deterministically with baseline and required pairwise coverage', () => {
        const policy = { seed: 41, maxCells: 8, pairWith: ['widgets', 'lod'] };
        const first = cartesianMatrix(axes, policy);
        const second = cartesianMatrix(axes, policy);
        expect(first.strategy).toBe('sampled');
        expect(first.total).toBe(12);
        expect(first.sampled).toBe(8);
        expect(first.cells).toEqual(second.cells);
        expect(cartesianMatrix(axes, { ...policy, seed: 42 }).cells).not.toEqual(first.cells);
        expect(hasCombination(first, { widgets: 'none', lod: 'dot', depth: 'flat' })).toBe(true);
        expect(hasCombination(first, { widgets: 'body', lod: 'card' })).toBe(true);
    });

    it('keeps the widgets times two-axis combination the capture gate lacked', () => {
        const matrix = cartesianMatrix(axes, { maxCells: 12 });
        expect(hasCombination(matrix, { widgets: 'max', lod: 'dot', depth: 'orbit' })).toBe(true);
    });
});

describe('metrics, templates and reporting (P5.3-P5.5)', () => {
    it('records neutral events without declaring a success criterion', () => {
        const harness = new MetricsHarness();
        harness.record({ id: 'a', kind: 'wrongTurn', at: 1 });
        harness.record({ id: 'b', kind: 'wrongTurn', at: 2 });
        harness.record({ id: 'c', kind: 'preferencePrompt', at: 3 });
        expect(harness.snapshot().total).toBe(3);
        expect(harness.counters()).toEqual({ wrongTurn: 2, preferencePrompt: 1 });
        harness.reset();
        expect(harness.snapshot().events).toEqual([]);
    });

    it('adapts an existing counter record without owning it', () => {
        expect(fromCounterRecord({ why: 2, answer: 1 })).toEqual([
            { id: 'why-1', kind: 'why' },
            { id: 'why-2', kind: 'why' },
            { id: 'answer-1', kind: 'answer' },
        ]);
    });

    it('keeps templates inert with explicit stop rules', () => {
        expect(EXPERIMENT_TEMPLATES.map((template) => template.id)).toEqual([
            'reaction',
            'task-study',
            'ab-config',
        ]);
        expect(templateById('ab-config')?.stopRule).toContain('no configuration is a default');
    });

    it('states matrix, sampling and negative results in the report', () => {
        const matrix = cartesianMatrix(axes, { seed: 41, maxCells: 8 });
        const report = reportMarkdown({
            title: 'Depth experiment',
            matrix,
            template: templateById('ab-config'),
            results: [
                { name: 'orbit flights helped', value: '2 of 5', negative: true },
                { name: 'flat maps were faster' },
            ],
        });
        expect(report).toContain('sampled, seed 41');
        expect(report).toContain('Negative result: orbit flights helped');
        expect(report).toContain('Result: flat maps were faster');
    });
});
