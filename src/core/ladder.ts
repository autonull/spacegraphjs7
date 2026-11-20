// The engine shared by host-ordered ladders: rung ordering, eligibility gating, hysteresis and
// per-entity resolution. Payload semantics stay with each ladder; this module never inspects them.

import { clamp } from '../utils/math';
import type { ScaleSample } from '../zoom/ScaleDomain';
import { selectRung, type Rung } from './rung';

export interface RungGate {
    readonly kinds?: readonly string[];
    readonly minImportance?: number;
}

export interface LadderEntry {
    readonly id: string;
    readonly kind: string;
    readonly importance?: number;
}

export interface RungStop {
    readonly at: number;
    readonly id: string;
}

/** Build rungs from scale stops; a stop without a payload is dropped and `at` is clamped to [0, 1]. */
export function rungsFromStops<Stop extends RungStop, Payload, Candidate>(
    stops: readonly Stop[],
    payloads: Partial<Record<string, Payload>>,
    makeRung: (at: number, id: string, payload: Payload) => Candidate,
): Candidate[] {
    return stops.flatMap((stop) => {
        const payload = payloads[stop.id];
        return payload ? [makeRung(clamp(stop.at, 0, 1), stop.id, payload)] : [];
    });
}

/** Ordering, gating, hysteresis and id-keyed resolution; subclasses map a rung to a selection. */
export abstract class LadderBase<
    Entry extends LadderEntry,
    Candidate extends Rung & RungGate,
    Selection,
> {
    readonly #rungs: Candidate[];
    readonly #hysteresis: number;

    constructor(rungs: readonly Candidate[] = [], config: { readonly hysteresis?: number } = {}) {
        this.#rungs = [...rungs].sort((a, b) => a.at - b.at);
        this.#hysteresis = config.hysteresis ?? 0;
    }

    get ids(): readonly string[] {
        return this.#rungs.map((rung) => rung.id);
    }

    register(rung: Candidate): this {
        this.#rungs.push(rung);
        this.#rungs.sort((a, b) => a.at - b.at);
        return this;
    }

    /** One entry's rung at one scale sample, with hysteresis against its previous rung. */
    select(entry: Entry, sample: ScaleSample, previous?: string): Selection | undefined {
        const importance = entry.importance ?? sample.importance;
        const candidates = this.#rungs.filter(
            (rung) =>
                (!rung.kinds || rung.kinds.includes(entry.kind)) &&
                (rung.minImportance === undefined || importance >= rung.minImportance),
        );
        const rung = selectRung(candidates, sample.normalized, previous, this.#hysteresis);
        return rung ? this.createSelection(entry, sample, rung) : undefined;
    }

    /** Every entry's selection, keyed by the id the host uses for selection and permalinks. */
    resolve(
        entries: readonly Entry[],
        sample: ScaleSample,
        previous: ReadonlyMap<string, string> = new Map(),
    ): Map<string, Selection> {
        return new Map(
            entries.flatMap((entry) => {
                const selection = this.select(entry, sample, previous.get(entry.id));
                return selection ? [[entry.id, selection] as const] : [];
            }),
        );
    }

    protected abstract createSelection(entry: Entry, sample: ScaleSample, rung: Candidate): Selection;
}
