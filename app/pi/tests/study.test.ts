// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    STOP_RULE,
    STUDY_SURFACES,
    STUDY_TASKS,
    StudyRecorder,
    counterbalance,
    studyGraphLayout,
    studyMatrix,
    studyReport,
    studyUI,
    type StudyTrial,
} from '../src/study';

const trial = (overrides: Partial<StudyTrial> = {}): StudyTrial => ({
    participant: 1,
    taskID: 'question-1',
    surface: 'log',
    success: true,
    elapsedMs: 1000,
    wrongTurns: 0,
    preference: 3,
    quote: '',
    events: [],
    ...overrides,
});

describe('opt-in graph view override', () => {
    it('reads a valid pilot layout from the harness query only', () => {
        expect(studyGraphLayout('')).toBeUndefined();
        expect(studyGraphLayout('?studyGraphLayout=timeline')).toBe('timeline');
        expect(studyGraphLayout('?studyGraphLayout=timeline-rows')).toBe('timeline-rows');
        expect(studyGraphLayout('?studyGraphLayout=nope')).toBeUndefined();
    });

    it('reads a valid UI preset from the harness query only', () => {
        expect(studyUI('')).toBeUndefined();
        expect(studyUI('?studyUI=compact')).toBe('compact');
        expect(studyUI('?studyUI=presentation&studyGraphLayout=timeline')).toBe('presentation');
        expect(studyUI('?studyUI=nope')).toBeUndefined();
    });

    it('leaves the default matrix axes untouched', () => {
        expect(studyMatrix().axes).toEqual(['surface', 'depth', 'arrangement']);
        expect(studyMatrix().total).toBe(36);
    });
});

describe('five-task study protocol', () => {
    it('has one task per investigative question and a stop rule', () => {
        expect(STUDY_TASKS.map((task) => task.id)).toEqual([
            'question-1',
            'question-2',
            'question-3',
            'question-4',
            'question-5',
        ]);
        expect(
            STUDY_TASKS.every((task) => task.expected.length > 0 && task.answerIDs.length > 0),
        ).toBe(true);
        expect(STOP_RULE).toContain('negative result');
    });

    it('samples the geometry matrix deterministically', () => {
        const first = studyMatrix();
        expect(first.axes).toEqual(['surface', 'depth', 'arrangement']);
        expect(first.total).toBe(36);
        expect(first.strategy).toBe('sampled');
        expect(first.cells.length).toBe(first.sampled);
        expect(first).toEqual(studyMatrix());
    });

    it('counterbalances surfaces across participants and tasks', () => {
        const assignments = counterbalance(5);
        expect(assignments).toHaveLength(25);
        for (let participant = 1; participant <= 5; participant += 1) {
            const rows = assignments.filter((row) => row.participant === participant);
            expect(rows).toHaveLength(5);
            expect(new Set(rows.map((row) => row.surface)).size).toBe(STUDY_SURFACES.length);
            expect(new Set(rows.map((row) => row.taskID)).size).toBe(5);
        }
        expect(assignments[0]!.surface).not.toBe(counterbalance(5)[5]!.surface);
    });
});

describe('study recorder and report', () => {
    it('records neutral events and returns one trial per answer', () => {
        const recorder = new StudyRecorder(2);
        recorder.mark('surfaceOpen', { surface: 'map' });
        const result = recorder.record({
            participant: 2,
            taskID: 'question-3',
            surface: 'map',
            success: true,
            elapsedMs: 4200,
            wrongTurns: 1,
            preference: 4,
            quote: 'the map kept the turn in view',
        });
        expect(result.events.map((event) => event.kind)).toEqual(['surfaceOpen', 'answer']);
        expect(recorder.trials).toEqual([result]);
    });

    it('records the UI preset on a trial and reports success by preset', () => {
        const recorder = new StudyRecorder(3);
        const result = recorder.record({
            participant: 3,
            taskID: 'question-2',
            surface: 'hybrid',
            ui: 'compact',
            success: true,
            elapsedMs: 3100,
            wrongTurns: 0,
            preference: 5,
            quote: '',
        });
        expect(result.ui).toBe('compact');
        expect(result.events.map((event) => event.meta?.ui)).toEqual(['compact']);
        const report = studyReport([trial({ ui: 'compact' }), trial({ ui: 'compact' })], studyMatrix());
        expect(report).toContain('ui compact: 2 trials');
    });

    it('prints a negative result when a spatial surface loses to the log', () => {
        const trials = [
            trial({ surface: 'log', success: true }),
            trial({ surface: 'log', success: true, taskID: 'question-2' }),
            trial({ surface: 'map', success: false, taskID: 'question-3' }),
        ];
        const report = studyReport(trials, studyMatrix());
        expect(report).toContain('Negative result: map');
        expect(report).toContain('n=1');
        expect(report).not.toContain('Negative result: log');
    });
});
