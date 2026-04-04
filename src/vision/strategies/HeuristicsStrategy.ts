// SpaceGraphJS - Heuristics Strategy
// Vision analysis using WCAG, spatial indexing, and Fitts's law

import * as THREE from 'three';
import type { VisionStrategy, VisionReport, VisionContext } from '../types';
import type { LegibilityResult, OverlapResult, HierarchyResult, ErgonomicsResult } from '../types';
import { LegibilityAnalyzer } from '../analyzers/LegibilityAnalyzer';
import { OverlapAnalyzer } from '../analyzers/OverlapAnalyzer';
import { HierarchyAnalyzer } from '../analyzers/HierarchyAnalyzer';
import { ErgonomicsAnalyzer } from '../analyzers/ErgonomicsAnalyzer';

export interface HeuristicsConfig {
    wcagThreshold: number;
    overlapPadding: number;
    fittsLawTargetSize: number;
}

const GRADE_THRESHOLDS = [
    { grade: 'A', minScore: 90 },
    { grade: 'B', minScore: 80 },
    { grade: 'C', minScore: 70 },
    { grade: 'D', minScore: 60 },
    { grade: 'F', minScore: 0 },
] as const;

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    return (GRADE_THRESHOLDS.find((t) => score >= t.minScore)?.grade ?? 'F') as
        | 'A'
        | 'B'
        | 'C'
        | 'D'
        | 'F';
}

function deduct(
    issues: Array<{
        severity: 'error' | 'warning' | 'info';
        category: string;
        message: string;
        nodeIds?: string[];
    }>,
    category: string,
    failures: Array<{ severity: string; nodeId: string }> | undefined,
    errorPenalty: number,
    warningPenalty: number,
): number {
    if (!failures) return 0;
    let deduction = 0;
    for (const failure of failures) {
        const penalty = failure.severity === 'error' ? errorPenalty : warningPenalty;
        deduction += penalty;
        issues.push({
            severity: failure.severity === 'error' ? 'error' : 'warning',
            category: category as 'legibility' | 'overlap' | 'hierarchy' | 'ergonomics',
            message: `${failure.severity === 'error' ? 'Poor' : 'Low'} contrast on node ${failure.nodeId}`,
            nodeIds: [failure.nodeId],
        });
    }
    return deduction;
}

export class HeuristicsStrategy implements VisionStrategy {
    readonly id = 'heuristics';
    readonly name = 'Heuristics Only';

    private config: HeuristicsConfig;
    private analyzers = [
        new LegibilityAnalyzer(),
        new OverlapAnalyzer(),
        new HierarchyAnalyzer(),
        new ErgonomicsAnalyzer(),
    ];

    constructor(options?: Partial<HeuristicsConfig>) {
        this.config = {
            wcagThreshold: options?.wcagThreshold ?? 4.5,
            overlapPadding: options?.overlapPadding ?? 5,
            fittsLawTargetSize: options?.fittsLawTargetSize ?? 44,
        };
    }

    async analyze(graph: unknown, camera: unknown): Promise<VisionReport> {
        const context: VisionContext = {
            graph,
            camera,
            nodes: this.extractNodes(graph),
        };

        const [legibility, overlap, hierarchy, ergonomics] = await Promise.all([
            this.analyzers[0].analyze(context, this.config) as Promise<LegibilityResult>,
            this.analyzers[1].analyze(context, this.config) as Promise<OverlapResult>,
            this.analyzers[2].analyze(context, this.config) as Promise<HierarchyResult>,
            this.analyzers[3].analyze(context, this.config) as Promise<ErgonomicsResult>,
        ]);

        const overall = this.computeOverallScore({ legibility, overlap, hierarchy, ergonomics });

        return { legibility, overlap, hierarchy, ergonomics, overall };
    }

    private extractNodes(graph: unknown): unknown[] {
        if (graph && typeof graph === 'object' && 'getNodes' in graph) {
            const g = graph as { getNodes: () => Iterable<unknown> };
            return Array.from(g.getNodes());
        }
        return [];
    }

    private computeOverallScore(results: {
        legibility: unknown;
        overlap: unknown;
        hierarchy: unknown;
        ergonomics: unknown;
    }): {
        score: number;
        grade: 'A' | 'B' | 'C' | 'D' | 'F';
        issues: Array<{
            severity: 'error' | 'warning' | 'info';
            category: 'legibility' | 'overlap' | 'hierarchy' | 'ergonomics';
            message: string;
            nodeIds?: string[];
        }>;
    } {
        const issues: Array<{
            severity: 'error' | 'warning' | 'info';
            category: 'legibility' | 'overlap' | 'hierarchy' | 'ergonomics';
            message: string;
            nodeIds?: string[];
        }> = [];

        let score = 100;

        const leg = results.legibility as {
            failures?: Array<{ severity: string; nodeId: string }>;
        };
        score -= deduct(issues, 'legibility', leg.failures, 10, 5);

        const overlap = results.overlap as { overlaps?: Array<{ nodeA: string; nodeB: string }> };
        if (overlap.overlaps?.length) {
            score -= overlap.overlaps.length * 5;
            issues.push({
                severity: 'error',
                category: 'overlap',
                message: `${overlap.overlaps.length} node overlaps detected`,
                nodeIds: overlap.overlaps.flatMap((o) => [o.nodeA, o.nodeB]),
            });
        }

        const ergo = results.ergonomics as {
            smallTargets?: Array<{ nodeId: string; size: number }>;
        };
        if (ergo.smallTargets?.length) {
            score -= ergo.smallTargets.length * 2;
            issues.push({
                severity: 'warning',
                category: 'ergonomics',
                message: `${ergo.smallTargets.length} targets too small`,
                nodeIds: ergo.smallTargets.map((t) => t.nodeId),
            });
        }

        const clampedScore = Math.max(0, Math.min(100, score));
        const grade = getGrade(clampedScore);

        return { score: clampedScore, grade, issues };
    }
}
