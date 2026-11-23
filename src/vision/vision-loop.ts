// Opt-in bridge from a vision report to host policy. The loop owns no layout or renderer state:
// it analyzes, maps a report to normalized scores, hands them to the host policy, then measures
// again. Every mutation happens in the host callback, only when a cycle is explicitly requested.

import { clamp01 } from '../utils/math';
import type { ScopePolicyInput } from '../layout/scope-policy';
import type { VisionReport } from './types';

export const VISION_SCORE_KEYS = ['overlap', 'legibility', 'hierarchy', 'ergonomics'] as const;
export type VisionScoreKey = (typeof VISION_SCORE_KEYS)[number];
export type VisionLoopScores = Record<VisionScoreKey, number>;

export interface VisionLoopReport {
    readonly before: VisionReport;
    readonly after: VisionReport;
    readonly scores: VisionLoopScores;
    /** Scores far enough from neutral to retarget layout in this cycle. */
    readonly retargeted: readonly VisionScoreKey[];
}

export interface VisionLoopAnalyzers {
    readonly strategy: string;
    /** Pure analysis of the current scene; must not mutate layout. */
    analyze(): Promise<VisionReport>;
}

export type VisionLoopPolicy = (input: ScopePolicyInput, scores: VisionLoopScores) => void;

export interface VisionUnsupported {
    readonly id: string;
    readonly reason: string;
}

export interface VisionLoop {
    readonly strategy: string;
    readonly lastReport: VisionLoopReport | undefined;
    reportUnsupported(): readonly VisionUnsupported[];
    cycle(): Promise<VisionLoopReport | undefined>;
}

/** Normalized 0..1 scores. Overlap is the only "higher is worse" score. */
export const visionScores = (report: VisionReport): VisionLoopScores => ({
    overlap: clamp01(report.overlap.overlapCount / 8),
    legibility: clamp01(1 - report.legibility.failures.length * 0.1),
    hierarchy: clamp01(report.hierarchy.score / 100),
    ergonomics: clamp01(report.ergonomics.score / 100),
});

/** Scores a host should treat as a layout retarget for this cycle. */
export const retargetedScores = (scores: VisionLoopScores): readonly VisionScoreKey[] =>
    VISION_SCORE_KEYS.filter((key) => (key === 'overlap' ? scores[key] >= 0.1 : scores[key] < 0.9));

export function createVisionLoop(
    analyzers: VisionLoopAnalyzers | undefined,
    policy: VisionLoopPolicy,
): VisionLoop {
    let lastReport: VisionLoopReport | undefined;
    return {
        get strategy() {
            return analyzers?.strategy ?? 'unavailable';
        },
        get lastReport() {
            return lastReport;
        },
        reportUnsupported: () =>
            analyzers ? [] : [{ id: 'vision-loop', reason: 'No vision analyzers registered.' }],
        async cycle() {
            if (!analyzers) return undefined;
            const before = await analyzers.analyze();
            const scores = visionScores(before);
            const retargeted = retargetedScores(scores);
            policy({ vision: scores }, scores);
            const after = await analyzers.analyze();
            lastReport = { before, after, scores, retargeted };
            return lastReport;
        },
    };
}
