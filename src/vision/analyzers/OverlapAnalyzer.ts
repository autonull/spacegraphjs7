// SpaceGraphJS - Overlap Analyzer
// Spatial index-based overlap detection

import * as THREE from 'three';
import type { VisionContext } from '../types';
import type { OverlapResult, Overlap } from '../types';
import type { HeuristicsConfig } from '../strategies/HeuristicsStrategy';
import { SpatialIndex } from '../../core/spatial/SpatialIndex';

/**
 * Overlap Analyzer
 * Detects node overlaps using spatial indexing for O(n·k) performance
 */
export class OverlapAnalyzer {
  /**
   * Analyze node overlaps
   */
  async analyze(
    context: VisionContext,
    config: HeuristicsConfig
  ): Promise<OverlapResult> {
    const nodes = context.nodes as Array<{
      id: string;
      object?: THREE.Object3D;
      position: THREE.Vector3;
    }>;

    if (nodes.length === 0) {
      return {
        hasOverlaps: false,
        overlapCount: 0,
        overlaps: []
      };
    }

    // Build spatial index
    const spatialIndex = new SpatialIndex(config.overlapPadding * 2);
    spatialIndex.build(nodes);

    // Find all overlaps
    const overlapPairs = spatialIndex.findAllOverlaps();
    
    // Refine overlaps with precise bounds checking
    const checked = new Set<string>();

    const overlaps = overlapPairs.reduce<Overlap[]>((acc, [nodeA, nodeB]) => {
      // Avoid duplicates
      const key = nodeA.id < nodeB.id ? `${nodeA.id}-${nodeB.id}` : `${nodeB.id}-${nodeA.id}`;
      if (checked.has(key)) return acc;
      checked.add(key);

      const penetration = this.computePenetration(nodeA, nodeB);
      if (penetration > 0) {
        acc.push({ nodeA: nodeA.id, nodeB: nodeB.id, penetration });
      }
      return acc;
    }, []);

    return {
      hasOverlaps: overlaps.length > 0,
      overlapCount: overlaps.length,
      overlaps
    };
  }

  /**
   * Compute penetration depth between two nodes
   */
  private computePenetration(
    nodeA: { object?: THREE.Object3D; position: THREE.Vector3 },
    nodeB: { object?: THREE.Object3D; position: THREE.Vector3 }
  ): number {
    // Get bounds for both nodes
    const boxA = nodeA.object
      ? new THREE.Box3().setFromObject(nodeA.object)
      : new THREE.Box3().makeEmpty().expandByPoint(nodeA.position);

    const boxB = nodeB.object
      ? new THREE.Box3().setFromObject(nodeB.object)
      : new THREE.Box3().makeEmpty().expandByPoint(nodeB.position);

    // Check intersection
    if (!boxA.intersectsBox(boxB)) {
      return 0;
    }

    // Compute penetration depth
    const overlapX = Math.min(boxA.max.x, boxB.max.x) - Math.max(boxA.min.x, boxB.min.x);
    const overlapY = Math.min(boxA.max.y, boxB.max.y) - Math.max(boxA.min.y, boxB.min.y);
    const overlapZ = Math.min(boxA.max.z, boxB.max.z) - Math.max(boxA.min.z, boxB.min.z);

    // Return minimum penetration
    return Math.min(overlapX, overlapY, overlapZ);
  }
}
