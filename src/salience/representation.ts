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

/** Legibility gates spectacle: activity can promote a rung, poor legibility demotes it. */
export const representationRung = ({
    level,
    activity,
    legibility,
}: RepresentationInput): RepresentationRung => {
    if (level === 'overview' && activity > 0.6 && legibility >= 0.7) return 'execution';
    if (level === 'detail' && legibility < 0.5) return 'execution';
    return level;
};
