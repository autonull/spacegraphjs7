import type { VisionStrategy, VisionReport, VisionContext } from '../types';
import { HeuristicsStrategy } from './HeuristicsStrategy';
import { OnnxStrategy } from './OnnxStrategy';

export class HybridStrategy implements VisionStrategy {
    readonly id = 'hybrid';
    readonly name = 'Hybrid (Heuristics + AI)';

    constructor(
        private readonly heuristics: HeuristicsStrategy,
        private readonly onnx: OnnxStrategy
    ) {}

    async analyze(graph: unknown, camera: unknown): Promise<VisionReport> {
        const [hReport, oReport] = await Promise.all([
            this.heuristics.analyze(graph, camera),
            this.onnx.analyze(graph, camera)
        ]);

        // Merge reports, preferring ONNX for scores but combining issues
        return {
            legibility: {
                wcagAA: hReport.legibility.wcagAA && oReport.legibility.wcagAA,
                averageContrast: (hReport.legibility.averageContrast + oReport.legibility.averageContrast) / 2,
                failures: this.deduplicateFailures(hReport.legibility.failures, oReport.legibility.failures)
            },
            overlap: {
                hasOverlaps: hReport.overlap.hasOverlaps || oReport.overlap.hasOverlaps,
                overlapCount: Math.max(hReport.overlap.overlapCount, oReport.overlap.overlapCount),
                overlaps: this.deduplicateOverlaps(hReport.overlap.overlaps, oReport.overlap.overlaps)
            },
            hierarchy: {
                ...oReport.hierarchy,
                score: (hReport.hierarchy.score + oReport.hierarchy.score) / 2
            },
            ergonomics: {
                ...oReport.ergonomics,
                score: (hReport.ergonomics.score + oReport.ergonomics.score) / 2
            },
            overall: {
                score: (hReport.overall.score + oReport.overall.score) / 2,
                grade: this.calculateGrade((hReport.overall.score + oReport.overall.score) / 2),
                issues: [...hReport.overall.issues, ...oReport.overall.issues]
            }
        };
    }

    private deduplicateFailures(h: any[], o: any[]): any[] {
        const seen = new Set(h.map(f => f.nodeId));
        return [...h, ...o.filter(f => !seen.has(f.nodeId))];
    }

    private deduplicateOverlaps(h: any[], o: any[]): any[] {
        const getKey = (ov: any) => [ov.nodeA, ov.nodeB].sort().join(':');
        const seen = new Set(h.map(getKey));
        return [...h, ...o.filter(ov => !seen.has(getKey(ov)))];
    }

    private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }
}
