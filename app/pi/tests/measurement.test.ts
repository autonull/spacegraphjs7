// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    POLICY_SCHEMA,
    resolvePolicy,
    sampleExperiment,
    type PolicyExperiment,
} from '../src/policy';
import {
    experimentReportMarkdown,
    exportOnlineOutcomes,
    measureExperiment,
    recordDecision,
} from '../src/policy/measurement';
import { SessionRecorder, type EventScorer } from '../src/recorder';

const incumbentVector = resolvePolicy(POLICY_SCHEMA).vector;

const experiment: PolicyExperiment = {
    id: 'test-camera',
    title: 'Do shorter flights help?',
    families: ['camera'],
    variants: { 'camera.verbMs': [900, 250] },
    seed: 1,
    maxCells: 4,
    metrics: ['success', 'travel'],
    decisionRule:
        'Graduate only with a recorded comparison and a human decision. Publish negatives verbatim.',
};

const scorer: EventScorer = (event, policy) => ({
    success: event.kind === 'answer' ? 1 : 0,
    wrongTurns: event.kind === 'wrong-turn' ? 1 : 0,
    travel: event.kind === 'reveal' ? Number(policy['camera.verbMs']) / 1000 : 0,
    legibility: Number(policy['emphasis.cap']),
});

const session = () => {
    const recorder = new SessionRecorder('pi:local', () => 0);
    recorder.record('reveal', incumbentVector);
    recorder.record('answer', incumbentVector);
    return recorder.export();
};

const measurement = () =>
    measureExperiment(
        sampleExperiment(POLICY_SCHEMA, experiment),
        session(),
        scorer,
        incumbentVector,
    );

describe('offline experiment measurement', () => {
    it('replays every cell and shortlists only strict improvements', () => {
        const result = measurement();
        expect(result.cells).toHaveLength(2);
        expect(result.shortlist).toHaveLength(1);
        const winner = result.cells.find((cell) => cell.shortlisted)!;
        expect(winner.cell.vector['camera.verbMs']).toBe(250);
        expect(winner.deltas.travel).toBeLessThan(0);
        const rejected = result.cells.find((cell) => !cell.shortlisted)!;
        expect(rejected.reasons).toContain('no measure improved');
    });

    it('keeps the incumbent baseline and the decision rule as data', () => {
        const result = measurement();
        expect(result.incumbent.success).toBeCloseTo(0.5);
        expect(result.decisionRule).toBe(experiment.decisionRule);
        expect(result.humanDecision).toBeUndefined();
    });

    it('records a human decision before any promotion', () => {
        const decided = recordDecision(measurement(), 'cell-1', 'graduate', 'panel agreed');
        expect(decided.humanDecision).toEqual({
            cellID: 'cell-1',
            decision: 'graduate',
            note: 'panel agreed',
        });
        expect(measurement().humanDecision).toBeUndefined();
    });

    it('renders a portable report with negative results verbatim', () => {
        const report = experimentReportMarkdown(measurement());
        expect(report).toContain('test-camera');
        expect(report).toContain('Publish negatives verbatim.');
        expect(report).toContain('no measure improved');
        expect(report).toContain('Human decision: pending');
        expect(report).toContain('Shortlist:');
    });

    it('exports online exposure and outcomes without raw prompt text', () => {
        const recorder = new SessionRecorder('pi:local', () => 0);
        recorder.record('experiment:exposure', incumbentVector, { cell: 'cell-0' });
        recorder.record('reveal', incumbentVector, {
            target: 'secret-target',
            text: 'secret prompt',
        });
        recorder.record('answer', incumbentVector);
        recorder.record('wrong-turn', incumbentVector);
        const exported = exportOnlineOutcomes(recorder.export());
        expect(exported.exposures).toEqual([{ cell: 'cell-0', atMs: 0 }]);
        expect(exported.outcomes.map((outcome) => outcome.kind)).toEqual(['answer', 'wrong-turn']);
        expect(exported.counts).toEqual({ 'cell-0': 1, answers: 1, wrongTurns: 1 });
        expect(JSON.stringify(exported)).not.toContain('secret');
    });
});
