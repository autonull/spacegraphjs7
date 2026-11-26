// One edge ladder: bundle → hair → arrow → labelled causal ribbon. The library selects a rung from
// a ScaleDomain sample; the host owns the styles and may replace or reorder every rung.

import { LadderBase, rungsFromStops, type LadderEntry } from '../core/ladder';
import type { EdgeData } from '../types/base-data';
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

/** A host entry whose optional importance overrides the scale's interpolated value. */
export type LadderEdge = LadderEntry;

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

export class EdgeLadder extends LadderBase<LadderEdge, EdgeRung, EdgeSelection> {
    protected createSelection(
        edge: LadderEdge,
        _sample: ScaleSample,
        rung: EdgeRung,
    ): EdgeSelection {
        return { id: edge.id, rung, style: rung.style ?? {} };
    }
}

/** Align rungs with scale stops; a missing style removes that rung. */
export function edgeLadderFromStops(
    stops: readonly { readonly at: number; readonly id: string }[],
    styles: Partial<Record<string, EdgeRungStyle>>,
    config: { readonly hysteresis?: number } = {},
): EdgeLadder {
    return new EdgeLadder(
        rungsFromStops(stops, styles, (at, id, style) => ({ at, id, style })),
        config,
    );
}
