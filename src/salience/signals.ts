// P2.1/P2.4. Salience is a host-composed score, not a visual language. Each signal returns a value
// and a reason label; the library sums weighted values, normalizes to [0, 1] and can explain any id.

import type { NodeStatus, RenderModel } from '@spacegraphjs/renderer';
import { clamp01 } from '../utils/math';

export interface SalienceInput {
    readonly model: RenderModel;
    /** Host-supplied clock; the library never reads the wall clock. */
    readonly now: number;
    readonly selected?: ReadonlySet<string>;
}

export interface SalienceSignal {
    readonly id: string;
    readonly label: string;
    /** Relative weight; non-positive signals are ignored. */
    readonly weight: number;
    readonly compute: (input: SalienceInput) => ReadonlyMap<string, number>;
}

export interface SalienceContribution {
    readonly signal: string;
    readonly label: string;
    readonly weight: number;
    readonly value: number;
    readonly contribution: number;
}

export interface SalienceResult {
    /** One score per node id in the model, in [0, 1]. */
    readonly values: ReadonlyMap<string, number>;
    /** Weighted, descending reasons for one id; empty when no signal fired. */
    explain(id: string): readonly SalienceContribution[];
}

/** Compose host signals into a deterministic score map with an explanation for every id. */
export function createSalience(signals: readonly SalienceSignal[]): (input: SalienceInput) => SalienceResult {
    const active = signals.filter((signal) => signal.weight > 0);
    const total = active.reduce((sum, signal) => sum + signal.weight, 0);

    return (input) => {
        const computed = active.map((signal) => ({
            signal,
            values: signal.compute(input),
        }));
        const values = new Map(
            input.model.nodes.map((node) => [
                node.id,
                total === 0
                    ? 0
                    : clamp01(
                          computed.reduce(
                              (sum, entry) =>
                                  sum + entry.signal.weight * clamp01(entry.values.get(node.id) ?? 0),
                              0,
                          ) / total,
                      ),
            ]),
        );

        return {
            values,
            explain(id) {
                if (total === 0) return [];
                return computed
                    .map(({ signal, values: signalValues }) => {
                        const value = clamp01(signalValues.get(id) ?? 0);
                        return {
                            signal: signal.id,
                            label: signal.label,
                            weight: signal.weight,
                            value,
                            contribution: (signal.weight * value) / total,
                        };
                    })
                    .filter((entry) => entry.contribution > 0)
                    .sort((a, b) => b.contribution - a.contribution);
            },
        };
    };
}

export const SALIENCE_SIGNAL_IDS = ['kind', 'status', 'recency', 'centrality', 'selection'] as const;
export type SalienceSignalId = (typeof SALIENCE_SIGNAL_IDS)[number];

/** Static per-kind base score. A host chooses the vocabulary and the numbers. */
export function kindSignal(weights: Readonly<Record<string, number>>, weight = 1): SalienceSignal {
    return {
        id: 'kind',
        label: 'node kind',
        weight,
        compute: ({ model }) =>
            new Map(model.nodes.map((node) => [node.id, weights[node.kind] ?? 0])),
    };
}

/** Static per-status base score. */
export function statusSignal(
    weights: Partial<Record<NodeStatus, number>>,
    weight = 1,
): SalienceSignal {
    return {
        id: 'status',
        label: 'node status',
        weight,
        compute: ({ model }) =>
            new Map(model.nodes.map((node) => [node.id, node.status ? (weights[node.status] ?? 0) : 0])),
    };
}

/** Exponential decay from a host-supplied timestamp; `now` comes from `SalienceInput`. */
export function recencySignal(
    timestamps: Readonly<Record<string, number>>,
    halfLifeMs = 60_000,
    weight = 1,
): SalienceSignal {
    return {
        id: 'recency',
        label: 'recency',
        weight,
        compute: ({ model, now }) =>
            new Map(
                model.nodes.map((node) => {
                    const at = timestamps[node.id];
                    return [node.id, at === undefined ? 0 : 2 ** (-Math.max(0, now - at) / halfLifeMs)];
                }),
            ),
    };
}

/** Graph degree normalized to the busiest node; isolated nodes score zero. */
export function centralitySignal(weight = 1): SalienceSignal {
    return {
        id: 'centrality',
        label: 'graph centrality',
        weight,
        compute: ({ model }) => {
            const degree = new Map<string, number>();
            for (const edge of model.edges) {
                degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
                degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
            }
            const max = Math.max(0, ...degree.values());
            return new Map(
                model.nodes.map((node) => [node.id, max ? (degree.get(node.id) ?? 0) / max : 0]),
            );
        },
    };
}

/** One for the current selection, zero elsewhere; the host owns selection state. */
export function selectionSignal(weight = 1): SalienceSignal {
    return {
        id: 'selection',
        label: 'current selection',
        weight,
        compute: ({ model, selected }) =>
            new Map(model.nodes.map((node) => [node.id, selected?.has(node.id) ? 1 : 0])),
    };
}
