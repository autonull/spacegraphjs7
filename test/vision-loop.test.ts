import { describe, expect, it } from 'vitest';
import type { ScopePolicyInput } from '../src/layout';
import {
    createVisionLoop,
    retargetedScores,
    visionScores,
    type VisionLoopAnalyzers,
    type VisionLoopScores,
} from '../src/vision/vision-loop';
import type { VisionReport } from '../src/vision/types';

const report = (
    overlapCount: number,
    failures = 0,
    hierarchy = 100,
    ergonomics = 100,
): VisionReport => ({
    legibility: {
        wcagAA: failures === 0,
        averageContrast: 7,
        failures: Array.from({ length: failures }, (_, index) => ({
            nodeId: `n${index}`,
            contrast: 3,
            severity: 'warning' as const,
        })),
    },
    overlap: { hasOverlaps: overlapCount > 0, overlapCount, overlaps: [] },
    hierarchy: { hasRoot: true, rootIds: ['root'], depth: 2, levels: [], score: hierarchy },
    ergonomics: {
        fittsLawCompliant: true,
        averageTargetSize: 60,
        smallTargets: [],
        score: ergonomics,
    },
    overall: { score: 90, grade: 'A', issues: [] },
});

describe('vision loop', () => {
    it('maps a report to normalized policy scores', () => {
        expect(visionScores(report(2, 1, 80, 60))).toEqual({
            overlap: 0.25,
            legibility: 0.9,
            hierarchy: 0.8,
            ergonomics: 0.6,
        });
    });

    it('lists only the scores that should retarget layout', () => {
        expect(
            retargetedScores({ overlap: 0, legibility: 1, hierarchy: 1, ergonomics: 1 }),
        ).toEqual([]);
        expect(
            retargetedScores({ overlap: 0.25, legibility: 0.9, hierarchy: 0.8, ergonomics: 0.6 }),
        ).toEqual(['overlap', 'hierarchy', 'ergonomics']);
    });

    it('applies policy once, measures twice and records the cycle without mutating itself', async () => {
        const before = report(2, 1, 80, 60);
        const after = report(0, 0, 100, 100);
        let analyses = 0;
        const seen: { input: ScopePolicyInput; scores: VisionLoopScores }[] = [];
        const analyzers: VisionLoopAnalyzers = {
            strategy: 'heuristics',
            analyze: async () => (analyses++ === 0 ? before : after),
        };
        const loop = createVisionLoop(analyzers, (input, scores) => seen.push({ input, scores }));

        const cycle = await loop.cycle();

        expect(analyses).toBe(2);
        expect(seen).toHaveLength(1);
        expect(seen[0].input.vision).toEqual(visionScores(before));
        expect(cycle).toEqual({
            before,
            after,
            scores: visionScores(before),
            retargeted: ['overlap', 'hierarchy', 'ergonomics'],
        });
        expect(loop.lastReport).toBe(cycle);
        expect(loop.strategy).toBe('heuristics');
    });

    it('reports unsupported analyzers and performs no work when absent', async () => {
        let applied = 0;
        const loop = createVisionLoop(undefined, () => {
            applied++;
        });

        expect(loop.strategy).toBe('unavailable');
        expect(loop.reportUnsupported()).toEqual([
            { id: 'vision-loop', reason: 'No vision analyzers registered.' },
        ]);
        expect(await loop.cycle()).toBeUndefined();
        expect(loop.lastReport).toBeUndefined();
        expect(applied).toBe(0);
    });
});
