// P5.3. A host-agnostic interaction recorder. Events are neutral; no counter is a success criterion
// unless a host protocol declares one.

export interface MetricEvent {
    readonly id: string;
    readonly kind: string;
    readonly at?: number;
    readonly meta?: Readonly<Record<string, string | number>>;
}

export interface MetricsSnapshot {
    readonly total: number;
    readonly counters: Readonly<Record<string, number>>;
    readonly events: readonly MetricEvent[];
}

export const STUDY_COUNTER_KINDS = [
    'surfaceOpen',
    'lensSwitch',
    'inlineToggle',
    'why',
    'answer',
] as const;
export type StudyCounterKind = (typeof STUDY_COUNTER_KINDS)[number];

export class MetricsHarness {
    readonly #events: MetricEvent[] = [];

    record(event: MetricEvent): void {
        this.#events.push(event);
    }

    counters(): Readonly<Record<string, number>> {
        return this.#events.reduce<Record<string, number>>((counts, event) => {
            counts[event.kind] = (counts[event.kind] ?? 0) + 1;
            return counts;
        }, {});
    }

    snapshot(): MetricsSnapshot {
        return { total: this.#events.length, counters: this.counters(), events: [...this.#events] };
    }

    reset(): void {
        this.#events.length = 0;
    }
}

/** Adapt an existing `StudyCounters` record without making it the API of the harness. */
export function fromCounterRecord(
    record: Readonly<Record<string, number>>,
): readonly MetricEvent[] {
    return Object.entries(record).flatMap(([kind, count]) =>
        Array.from({ length: Math.max(0, count) }, (_, index) => ({
            id: `${kind}-${index + 1}`,
            kind,
        })),
    );
}
