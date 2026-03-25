// SpaceGraphJS v7.0 - Ergonomics Analyzer
// Fitts's law analysis for interactive targets

import * as THREE from 'three';
import type { VisionContext } from '../types';
import type { ErgonomicsResult, TargetIssue } from '../types';
import type { HeuristicsConfig } from '../strategies/HeuristicsStrategy';

/**
 * Ergonomics Analyzer
 * Checks Fitts's law compliance for interactive elements
 */
export class ErgonomicsAnalyzer {
  /**
   * Analyze ergonomics
   */
  async analyze(
    context: VisionContext,
    config: HeuristicsConfig
  ): Promise<ErgonomicsResult> {
    const nodes = context.nodes as Array<{
      id: string;
      object?: THREE.Object3D;
      data: Record<string, unknown>;
    }>;

    const smallTargets: TargetIssue[] = [];
    let totalSize = 0;
    let nodeCount = 0;

    for (const node of nodes) {
      const size = this.getNodeTargetSize(node);
      totalSize += size;
      nodeCount++;

      if (size < config.fittsLawTargetSize) {
        smallTargets.push({
          nodeId: node.id,
          size,
          recommended: config.fittsLawTargetSize
        });
      }
    }

    const averageTargetSize = nodeCount > 0 ? totalSize / nodeCount : 0;
    const fittsLawCompliant = smallTargets.length === 0;

    // Compute score
    const score = this.computeScore(smallTargets, nodes.length);

    return {
      fittsLawCompliant,
      averageTargetSize,
      smallTargets,
      score
    };
  }

  /**
   * Get node's target size (in pixels at current zoom)
   */
  private getNodeTargetSize(node: {
    object?: THREE.Object3D;
    data: Record<string, unknown>;
  }): number {
    // Try to get size from data
    const dataSize = (node.data as { size?: number; width?: number; height?: number }).size;
    if (typeof dataSize === 'number') {
      return dataSize;
    }

    // Try to get from object bounds
    if (node.object) {
      const box = new THREE.Box3().setFromObject(node.object);
      const size = new THREE.Vector3()
        .subVectors(box.max, box.min);
      
      // Return average of x and y dimensions
      return (size.x + size.y) / 2;
    }

    // Default size
    return 50;
  }

  /**
   * Compute ergonomics score
   */
  private computeScore(smallTargets: TargetIssue[], totalNodes: number): number {
    if (totalNodes === 0) return 100;

    const violationRatio = smallTargets.length / totalNodes;
    
    // Score based on violation ratio
    // 0% violations = 100, 100% violations = 0
    const score = 100 * (1 - violationRatio);

    return Math.max(0, Math.min(100, score));
  }
}
