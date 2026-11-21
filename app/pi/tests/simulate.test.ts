// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    POLICY_SCHEMA,
    resolvePolicy,
    sampleExperiment,
    type PolicyExperiment,
} from '../src/policy';
import { measureExperiment } from '../src/policy/measurement';
import { simulateAndScore, simulateFixture } from '../src/policy/simulate';
import { replaySession, SessionRecorder, type EventScorer } from '../src/recorder';

const base = resolvePolicy(POLICY_SCHEMA).vector;

const scorer: EventScorer = (event) => ({
    success: event.kind === 'answer' ? 1 : 0,
    wrongTurns: event.kind === 'wrong-turn' ? 1 : 0,
    travel: 0,
    legibility: 0.05, // deliberately wrong: re-simulation must replace it
});

const session = (fixture = 'pi:local') => {
    const recorder = new SessionRecorder(fixture, () => 0);
    recorder.record('reveal', base);
    recorder.record('answer', base);
    return recorder.export();
};

const experiment: PolicyExperiment = {
    id: 'test-geometry',
    title: 'Does padding improve legibility?',
    families: ['geometry'],
    variants: { 'geometry.padding': [160, 0] },
    seed: 1,
    maxCells: 4,
    metrics: ['legibility'],
    decisionRule:
        'Graduate only with a recorded comparison and a human decision. Publish negatives verbatim.',
};

describe('simulation-backed offline replay', () => {
    it('re-simulates the fixture deterministically under a vector', () => {
        const a = simulateFixture(base);
        const b = simulateFixture(base);
        const points = (result: typeof a) =>
            [...result.positions].map(([id, position]) => [id, position.x, position.y, position.z]);
        expect(points(a)).toEqual(points(b));
        expect(a.vision).toEqual(b.vision);
    });

    it('changes rest positions and legibility when a geometry knob changes', () => {
        const wide = simulateFixture({ ...base, 'geometry.padding': 160 });
        const tight = simulateFixture({ ...base, 'geometry.padding': 0 });
        const xs = (result: typeof wide) => [...result.positions.values()].map((p) => p.x);
        expect(xs(tight)).not.toEqual(xs(wide));
        expect(tight.vision.legibility).toBeLessThan(wide.vision.legibility);
    });

    it('overrides the scorer legibility with the re-simulated vision', () => {
        const score = simulateAndScore(session(), base, scorer);
        expect(score.legibility).toBeCloseTo(simulateFixture(base).vision.legibility, 5);
        expect(score.legibility).not.toBeCloseTo(0.05, 2);
    });

    it('keeps human signals tied to the recorded events', () => {
        const score = simulateAndScore(session(), base, scorer);
        expect(score.success).toBeCloseTo(0.5);
        expect(score.wrongTurns).toBe(0);
        expect(score.travel).toBe(0);
    });

    it('falls back to event replay for an unknown fixture', () => {
        const recording = session('other:fixture');
        expect(simulateAndScore(recording, base, scorer)).toEqual(
            replaySession(recording, base, scorer),
        );
        expect(simulateAndScore(recording, base, scorer).legibility).toBeCloseTo(0.05, 5);
    });

    it('feeds geometry-variant scores into the experiment shortlist', () => {
        const result = measureExperiment(
            sampleExperiment(POLICY_SCHEMA, experiment),
            session(),
            scorer,
            base,
            simulateAndScore,
        );
        expect(result.cells).toHaveLength(2);
        expect(result.incumbent.legibility).toBeCloseTo(simulateFixture(base).vision.legibility, 5);
        const deltas = result.cells.map((cell) => cell.deltas.legibility);
        expect(deltas.some((delta) => Math.abs(delta) > 0.01)).toBe(true);
        expect(result.shortlist).toEqual([]);
    });
});
