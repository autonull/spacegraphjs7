// SpaceGraphJS v7.0 - Heuristics Strategy
// Vision analysis using WCAG, spatial indexing, and Fitts's law

import * as THREE from 'three';
import type { VisionStrategy, VisionReport, VisionContext } from '../types';
import { LegibilityAnalyzer } from '../analyzers/LegibilityAnalyzer';
import { OverlapAnalyzer } from '../analyzers/OverlapAnalyzer';
import { HierarchyAnalyzer } from '../analyzers/HierarchyAnalyzer';
import { ErgonomicsAnalyzer } from '../analyzers/ErgonomicsAnalyzer';

/**
 * Heuristics configuration
 */
export interface HeuristicsConfig {
  wcagThreshold: number;
  overlapPadding: number;
  fittsLawTargetSize: number;
}

/**
 * Heuristics-only vision strategy
 * Works without ONNX models using mathematical formulas and spatial analysis
 */
export class HeuristicsStrategy implements VisionStrategy {
  readonly id = 'heuristics';
  readonly name = 'Heuristics Only';

  private config: HeuristicsConfig;
  private analyzers = [
    new LegibilityAnalyzer(),
    new OverlapAnalyzer(),
    new HierarchyAnalyzer(),
    new ErgonomicsAnalyzer()
  ];

  constructor(options?: Partial<HeuristicsConfig>) {
    this.config = {
      wcagThreshold: options?.wcagThreshold ?? 4.5,
      overlapPadding: options?.overlapPadding ?? 5,
      fittsLawTargetSize: options?.fittsLawTargetSize ?? 44
    };
  }

  /**
   * Analyze graph using heuristics
   */
  async analyze(graph: unknown, camera: unknown): Promise<VisionReport> {
    const context: VisionContext = {
      graph,
      camera,
      nodes: this.extractNodes(graph)
    };

    // Run all analyzers in parallel
    const [legibility, overlap, hierarchy, ergonomics] = await Promise.all([
      this.analyzers[0].analyze(context, this.config),
      this.analyzers[1].analyze(context, this.config),
      this.analyzers[2].analyze(context, this.config),
      this.analyzers[3].analyze(context, this.config)
    ]);

    // Aggregate results
    const overall = this.computeOverallScore({
      legibility,
      overlap,
      hierarchy,
      ergonomics
    });

    return {
      legibility,
      overlap,
      hierarchy,
      ergonomics,
      overall
    };
  }

  /**
   * Extract nodes from graph
   */
  private extractNodes(graph: unknown): unknown[] {
    // Type guard for graph-like object
    if (graph && typeof graph === 'object' && 'getNodes' in graph) {
      const g = graph as { getNodes: () => Iterable<unknown> };
      return Array.from(g.getNodes());
    }
    return [];
  }

  /**
   * Compute overall vision score
   */
  private computeOverallScore(results: {
    legibility: unknown;
    overlap: unknown;
    hierarchy: unknown;
    ergonomics: unknown;
  }): { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F'; issues: Array<{
    severity: 'error' | 'warning' | 'info';
    category: 'legibility' | 'overlap' | 'hierarchy' | 'ergonomics';
    message: string;
    nodeIds?: string[];
  }> } {
    const issues: Array<{
      severity: 'error' | 'warning' | 'info';
      category: 'legibility' | 'overlap' | 'hierarchy' | 'ergonomics';
      message: string;
      nodeIds?: string[];
    }> = [];

    let score = 100;

    // Deduct for legibility issues
    const leg = results.legibility as { failures?: Array<{ severity: string; nodeId: string }> };
    if (leg.failures) {
      for (const failure of leg.failures) {
        if (failure.severity === 'error') {
          score -= 10;
          issues.push({
            severity: 'error',
            category: 'legibility',
            message: `Poor contrast on node ${failure.nodeId}`,
            nodeIds: [failure.nodeId]
          });
        } else {
          score -= 5;
          issues.push({
            severity: 'warning',
            category: 'legibility',
            message: `Low contrast on node ${failure.nodeId}`,
            nodeIds: [failure.nodeId]
          });
        }
      }
    }

    // Deduct for overlaps
    const overlap = results.overlap as { overlaps?: Array<{ nodeA: string; nodeB: string }> };
    if (overlap.overlaps && overlap.overlaps.length > 0) {
      score -= overlap.overlaps.length * 5;
      issues.push({
        severity: 'error',
        category: 'overlap',
        message: `${overlap.overlaps.length} node overlaps detected`,
        nodeIds: overlap.overlaps.flatMap(o => [o.nodeA, o.nodeB])
      });
    }

    // Deduct for ergonomics issues
    const ergo = results.ergonomics as { smallTargets?: Array<{ nodeId: string; size: number }> };
    if (ergo.smallTargets && ergo.smallTargets.length > 0) {
      score -= ergo.smallTargets.length * 2;
      issues.push({
        severity: 'warning',
        category: 'ergonomics',
        message: `${ergo.smallTargets.length} targets too small`,
        nodeIds: ergo.smallTargets.map(t => t.nodeId)
      });
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Determine grade
    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

    return { score, grade, issues };
  }
}
