// Host-composed representation ladder. The library decides only the legibility gate; hosts own
// budgets, markup and when to ask for a rung. Pure and dependency-free.

export type RepresentationRung = 'overview' | 'execution' | 'detail';

export interface RepresentationInput {
    readonly level: RepresentationRung;
    /** Decaying activity score of the node, in [0, 1]. */
    readonly activity: number;
    /** Latest legibility score, in [0, 1]. */
    readonly legibility: number;
}

export interface RepresentationThresholds {
    readonly promoteAt: number;
    readonly legibilityGate: number;
    readonly demoteBelow: number;
}

export const DEFAULT_THRESHOLDS: RepresentationThresholds = {
    promoteAt: 0.6,
    legibilityGate: 0.7,
    demoteBelow: 0.5,
};

/** Legibility gates spectacle: activity can promote a rung, poor legibility demotes it. */
export const representationRung = (
    { level, activity, legibility }: RepresentationInput,
    thresholds: RepresentationThresholds = DEFAULT_THRESHOLDS,
): RepresentationRung => {
    if (level === 'overview' && activity > thresholds.promoteAt && legibility >= thresholds.legibilityGate)
        return 'execution';
    if (level === 'detail' && legibility < thresholds.demoteBelow) return 'execution';
    return level;
};

export interface RepresentationWeights {
    readonly overview: number;
    readonly execution: number;
    readonly detail: number;
}

/** Continuous neighbour weight around a rung boundary; used only for visual crossfade. */
export const representationWeights = (
    input: RepresentationInput,
    thresholds: RepresentationThresholds = DEFAULT_THRESHOLDS,
    blend = 0.1,
): RepresentationWeights => {
    const width = Math.max(0.001, blend);
    const ramp = (distance: number): number =>
        Math.min(1, Math.max(0, (distance + width) / (2 * width)));
    const rung = representationRung(input, thresholds);
    if (rung === 'overview') {
        const t = ramp(input.activity - thresholds.promoteAt);
        return { overview: 1 - t, execution: t, detail: 0 };
    }
    if (rung === 'detail') {
        const t = ramp(thresholds.demoteBelow - input.legibility);
        return { overview: 0, execution: 1 - t, detail: t };
    }
    return { overview: 0, execution: 1, detail: 0 };
};
