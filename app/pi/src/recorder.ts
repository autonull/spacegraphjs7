import type { KnobValue, PolicyVector } from './policy/schema';

export interface RecordedEvent {
    readonly seq: number;
    readonly atMs: number;
    readonly kind: string;
    readonly meta: Readonly<Record<string, string | number | boolean>>;
    /** The resolved policy snapshot that produced this event. */
    readonly policy: PolicyVector;
}

export interface SessionRecording {
    readonly version: number;
    readonly fixture: string;
    readonly events: readonly RecordedEvent[];
}

export interface ErgonomicScore {
    readonly success: number;
    readonly legibility: number;
    readonly wrongTurns: number;
    readonly travel: number;
}

export type EventScorer = (event: RecordedEvent, policy: PolicyVector) => Partial<ErgonomicScore>;

const EMPTY_SCORE: ErgonomicScore = { success: 0, legibility: 0, wrongTurns: 0, travel: 0 };

/** Host-agnostic interaction log. Each event is stamped with the policy that produced it. */
export class SessionRecorder {
    readonly #events: RecordedEvent[] = [];
    readonly #clock: () => number;
    readonly #fixture: string;

    constructor(fixture: string, clock: () => number = () => 0) {
        this.#fixture = fixture;
        this.#clock = clock;
    }

    get events(): readonly RecordedEvent[] {
        return [...this.#events];
    }

    record(
        kind: string,
        policy: PolicyVector,
        meta: Readonly<Record<string, string | number | boolean>> = {},
    ): RecordedEvent {
        const event: RecordedEvent = {
            seq: this.#events.length + 1,
            atMs: this.#clock(),
            kind,
            meta,
            policy: { ...policy },
        };
        this.#events.push(event);
        return event;
    }

    export(): SessionRecording {
        return { version: 1, fixture: this.#fixture, events: [...this.#events] };
    }

    static from(recording: SessionRecording): SessionRecorder {
        const recorder = new SessionRecorder(recording.fixture);
        recorder.#events.push(...recording.events);
        return recorder;
    }
}

const scoreEvents = (recording: SessionRecording, policy: PolicyVector, scorer: EventScorer): ErgonomicScore => {
    const totals = { ...EMPTY_SCORE };
    let scored = 0;
    for (const event of recording.events) {
        const partial = scorer(event, policy);
        for (const key of Object.keys(EMPTY_SCORE) as (keyof ErgonomicScore)[]) {
            totals[key] += partial[key] ?? 0;
        }
        if (Object.keys(partial).length) scored++;
    }
    const divisor = Math.max(1, scored);
    return {
        success: totals.success / divisor,
        legibility: totals.legibility / divisor,
        wrongTurns: totals.wrongTurns / divisor,
        travel: totals.travel / divisor,
    };
};

/** Replay the same human interaction under a policy vector; fixtures and clocks stay identical. */
export const replaySession = (
    recording: SessionRecording,
    policy: PolicyVector,
    scorer: EventScorer,
): ErgonomicScore => scoreEvents(recording, policy, scorer);

/** Compare an incumbent against a variant on the same recorded events. */
export const counterfactual = (
    recording: SessionRecording,
    incumbent: PolicyVector,
    variant: PolicyVector,
    scorer: EventScorer,
): { incumbent: ErgonomicScore; variant: ErgonomicScore; successDelta: number; travelDelta: number } => {
    const base = replaySession(recording, incumbent, scorer);
    const candidate = replaySession(recording, variant, scorer);
    return {
        incumbent: base,
        variant: candidate,
        successDelta: candidate.success - base.success,
        travelDelta: candidate.travel - base.travel,
    };
};

export const eventKnob = (event: RecordedEvent, id: string): KnobValue | undefined => event.policy[id];
