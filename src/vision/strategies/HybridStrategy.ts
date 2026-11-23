import type { HeuristicsStrategy } from '..';
import { gradeFor } from '../grade';
import type { VisionReport, VisionStrategy } from '../types';
import type { OnnxStrategy } from './OnnxStrategy';

export class HybridStrategy implements VisionStrategy {
    readonly id = 'hybrid';
    readonly name = 'Hybrid (Heuristics + AI)';

    constructor(
        readonly heuristics: HeuristicsStrategy,
        readonly onnx: OnnxStrategy,
    ) {}

    async analyze(graph: unknown, camera: unknown): Promise<VisionReport> {
        const [hReport, oReport] = await Promise.all([
            this.heuristics.analyze(graph, camera),
            this.onnx.analyze(graph, camera),
        ]);

        const overallScore = (hReport.overall.score + oReport.overall.score) / 2;

        return {
            legibility: {
                wcagAA: hReport.legibility.wcagAA && oReport.legibility.wcagAA,
                averageContrast:
                    (hReport.legibility.averageContrast + oReport.legibility.averageContrast) / 2,
                failures: this.mergeUnique(hReport.legibility.failures, oReport.legibility.failures, (f) => f.nodeId),
            },
            overlap: {
                hasOverlaps: hReport.overlap.hasOverlaps || oReport.overlap.hasOverlaps,
                overlapCount: Math.max(hReport.overlap.overlapCount, oReport.overlap.overlapCount),
                overlaps: this.mergeUnique(hReport.overlap.overlaps, oReport.overlap.overlaps, (ov) =>
                    [ov.nodeA, ov.nodeB].sort().join(':'),
                ),
            },
            hierarchy: {
                ...oReport.hierarchy,
                score: (hReport.hierarchy.score + oReport.hierarchy.score) / 2,
            },
            ergonomics: {
                ...oReport.ergonomics,
                score: (hReport.ergonomics.score + oReport.ergonomics.score) / 2,
            },
            overall: {
                score: overallScore,
                grade: gradeFor(overallScore),
                issues: [...hReport.overall.issues, ...oReport.overall.issues],
            },
        };
    }

    private mergeUnique<T>(h: readonly T[], o: readonly T[], key: (item: T) => string): T[] {
        const seen = new Set(h.map(key));
        return [...h, ...o.filter((item) => !seen.has(key(item)))];
    }
}
