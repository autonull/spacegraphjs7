// One edge ladder: bundle → hair → arrow → labelled causal ribbon. The library selects a rung from
// a ScaleDomain sample; the host owns the styles and may replace or reorder every rung.

import { selectRung } from '../core/rung';
import type { EdgeData } from '../types/base-data';
import { clamp } from '../utils/math';
import type { ScaleSample } from '../zoom/ScaleDomain';

export const EDGE_RUNG_IDS = ['bundle', 'hair', 'arrow', 'ribbon'] as const;

export type EdgeRungStyle = Partial<
    Pick<EdgeData, 'thickness' | 'arrowhead' | 'dashed' | 'labelLod'>
>;

/** A host may adopt these as a starting point; none is a recommended default. */
export const DEFAULT_EDGE_STYLES: Readonly<Record<(typeof EDGE_RUNG_IDS)[number], EdgeRungStyle>> = {
    bundle: { thickness: 1, dashed: true },
    hair: { thickness: 1 },
    arrow: { thickness: 2, arrowhead: 'target' },
    ribbon: { thickness: 4, arrowhead: 'target', labelLod: [{ distance: 0 }] },
};

export interface LadderEdge {
    readonly id: string;
    readonly kind: string;
    /** Host salience value; overrides the interpolated importance of the scale. */
    readonly importance?: number;
}

export interface EdgeRung {
    readonly id: string;
    readonly at: number;
    /** Edge kinds served by this rung; omitted means every kind. */
    readonly kinds?: readonly string[];
    readonly minImportance?: number;
    readonly style?: EdgeRungStyle;
}

export interface EdgeSelection {
    readonly id: string;
    readonly rung: EdgeRung;
    readonly style: EdgeRungStyle;
}

export class EdgeLadder {
    readonly #rungs: EdgeRung[];
    readonly #hysteresis: number;

    constructor(rungs: readonly EdgeRung[] = [], config: { readonly hysteresis?: number } = {}) {
        this.#rungs = [...rungs].sort((a, b) => a.at - b.at);
        this.#hysteresis = config.hysteresis ?? 0;
    }

    get ids(): readonly string[] {
        return this.#rungs.map((rung) => rung.id);
    }

    register(rung: EdgeRung): this {
        this.#rungs.push(rung);
        this.#rungs.sort((a, b) => a.at - b.at);
        return this;
    }

    select(edge: LadderEdge, sample: ScaleSample, previous?: string): EdgeSelection | undefined {
        const importance = edge.importance ?? sample.importance;
        const candidates = this.#rungs.filter(
            (rung) =>
                (!rung.kinds || rung.kinds.includes(edge.kind)) &&
                (rung.minImportance === undefined || importance >= rung.minImportance),
        );
        const rung = selectRung(candidates, sample.normalized, previous, this.#hysteresis);
        return rung ? { id: edge.id, rung, style: rung.style ?? {} } : undefined;
    }

    resolve(
        edges: readonly LadderEdge[],
        sample: ScaleSample,
        previous: ReadonlyMap<string, string> = new Map(),
    ): Map<string, EdgeSelection> {
        return new Map(
            edges.flatMap((edge) => {
                const selection = this.select(edge, sample, previous.get(edge.id));
                return selection ? [[edge.id, selection] as const] : [];
            }),
        );
    }
}

/** Align rungs with scale stops; a missing style removes that rung. */
export function edgeLadderFromStops(
    stops: readonly { readonly at: number; readonly id: string }[],
    styles: Partial<Record<string, EdgeRungStyle>>,
    config: { readonly hysteresis?: number } = {},
): EdgeLadder {
    return new EdgeLadder(
        stops.flatMap((stop) => {
            const style = styles[stop.id];
            return style ? [{ at: clamp(stop.at, 0, 1), id: stop.id, style }] : [];
        }),
        config,
    );
}
