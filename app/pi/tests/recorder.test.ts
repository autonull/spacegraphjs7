// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { POLICY_SCHEMA, resolvePolicy } from '../src/policy';
import {
    SessionRecorder,
    counterfactual,
    ergonomicCounters,
    ergonomicProfile,
    eventKnob,
    replaySession,
    type EventScorer,
} from '../src/recorder';

const baseline = resolvePolicy(POLICY_SCHEMA).vector;
const quiet = { ...baseline, 'camera.verbMs': 250 };

const scorer: EventScorer = (event, policy) => ({
    success: event.kind === 'answer' ? 1 : 0,
    wrongTurns: event.kind === 'wrong-turn' ? 1 : 0,
    travel: event.kind === 'reveal' ? Number(policy['camera.verbMs']) / 1000 : 0,
    legibility: Number(policy['emphasis.cap']),
});

const recording = () => {
    let time = 0;
    const recorder = new SessionRecorder('pi:local', () => (time += 100));
    recorder.record('reveal', baseline, { target: 'pi:local:read-auth' });
    recorder.record('answer', baseline);
    recorder.record('wrong-turn', baseline, { target: 'pi:local:run-tests' });
    return recorder.export();
};

describe('session recorder', () => {
    it('stamps every event with the resolved policy snapshot', () => {
        const session = recording();
        expect(session.fixture).toBe('pi:local');
        expect(session.events.map((event) => event.seq)).toEqual([1, 2, 3]);
        expect(session.events[0].atMs).toBe(100);
        expect(session.events[0].policy).toEqual(baseline);
        expect(eventKnob(session.events[0], 'camera.verbMs')).toBe(900);
        const restored = SessionRecorder.from(session);
        expect(restored.export()).toEqual(session);
    });

    it('replays deterministically under the same policy', () => {
        const session = recording();
        expect(replaySession(session, baseline, scorer)).toEqual(replaySession(session, baseline, scorer));
        expect(replaySession(session, baseline, scorer).success).toBeCloseTo(1 / 3);
    });

    it('counts neutral ergonomic signals without declaring a success criterion', () => {
        const recorder = new SessionRecorder('pi:local', () => 0);
        recorder.record('descend', baseline);
        recorder.record('zoom-oscillation', baseline, { reversals: 2 });
        recorder.record('zoom-oscillation', baseline, { reversals: 3 });
        recorder.record('escape-hatch', baseline);
        const counters = ergonomicCounters(recorder.export());
        expect(counters.descend).toBe(1);
        expect(counters['zoom-oscillation']).toBe(2);
        expect(counters['escape-hatch']).toBe(1);
        expect(counters.answer).toBe(0);
    });

    it('re-scores the same human events under a different policy', () => {
        const result = counterfactual(recording(), baseline, quiet, scorer);
        expect(result.successDelta).toBe(0);
        expect(result.travelDelta).toBeLessThan(0);
        expect(result.variant.travel).toBeLessThan(result.incumbent.travel);
    });

    it('derives time-to-first-relevant, choice count and travel distance', () => {
        let time = 100;
        const recorder = new SessionRecorder('pi:local', () => (time += 200));
        recorder.record('policy:change', baseline);
        recorder.record('reveal', baseline, { target: 'a', choices: 4, travel: 10 });
        recorder.record('reveal', baseline, { target: 'b', choices: 6, travel: 15 });
        recorder.record('answer', baseline);
        const profile = ergonomicProfile(recorder.export());
        expect(profile['time-to-first-relevant']).toBe(200);
        expect(profile['choice-count']).toBe(10);
        expect(profile['travel-distance']).toBe(25);
        expect(profile.reveal).toBe(2);
        expect(profile.answer).toBe(1);
    });

    it('reports zero time-to-first-relevant when no relevant node is revealed', () => {
        const recorder = new SessionRecorder('pi:local', () => 42);
        recorder.record('descend', baseline);
        expect(ergonomicProfile(recorder.export())['time-to-first-relevant']).toBe(0);
    });
});
