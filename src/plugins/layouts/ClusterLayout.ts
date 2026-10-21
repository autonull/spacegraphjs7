import * as THREE from 'three';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface ClusterLayoutOptions extends LayoutOptions {
  clusterBy: string;
  clusterRadius: number;
  nodeRadius: number;
}

export class ClusterLayout extends BaseLayout<ClusterLayoutOptions> {
  readonly id = 'cluster-layout';
  readonly name = 'Cluster Layout';
  readonly version = '1.0.0';

  protected place(nodes: Node[], config: ClusterLayoutOptions): void {
    const clusters = new Map<string, Node[]>();
    for (const node of nodes) {
      const key =
        node.data?.[config.clusterBy] != null ? String(node.data[config.clusterBy]) : 'Uncategorized';
      const bucket = clusters.get(key);
      if (bucket) bucket.push(node);
      else clusters.set(key, [node]);
    }

    const target = new THREE.Vector3();
    const clusterGroups = [...clusters.values()];
    for (const [clusterIndex, clusterNodes] of clusterGroups.entries()) {
      const macroAngle = (Math.PI * 2 * clusterIndex) / clusterGroups.length;
      const macroRadius = clusterGroups.length > 1 ? config.clusterRadius : 0;
      const centerX = Math.cos(macroAngle) * macroRadius;
      const centerY = Math.sin(macroAngle) * macroRadius;

      for (const [nodeIndex, node] of clusterNodes.entries()) {
        this.applyPosition(
          node,
          clusterOffset(target, centerX, centerY, nodeIndex, clusterNodes.length, config.nodeRadius)
        );
      }
    }
  }

  protected defaultConfig(): ClusterLayoutOptions {
    return {
      clusterBy: 'category',
      clusterRadius: 300,
      nodeRadius: 100,
      animate: true,
      duration: 1.5,
    };
  }
}

/** A node's place inside its cluster: one node sits on the centre, a few ring it, many spread out. */
function clusterOffset(
  target: THREE.Vector3,
  centerX: number,
  centerY: number,
  nodeIndex: number,
  nodeCount: number,
  nodeRadius: number
): THREE.Vector3 {
  if (nodeCount === 1) return target.set(centerX, centerY, 0);
  if (nodeCount < 10) {
    const microAngle = (Math.PI * 2 * nodeIndex) / nodeCount;
    return target.set(
      centerX + Math.cos(microAngle) * nodeRadius,
      centerY + Math.sin(microAngle) * nodeRadius,
      0
    );
  }
  const phi = (1 + Math.sqrt(5)) / 2;
  const microAngle = (nodeIndex * 2 * Math.PI) / (phi * phi);
  const microRadius = nodeRadius * Math.sqrt(nodeIndex / nodeCount);
  return target.set(
    centerX + Math.cos(microAngle) * microRadius,
    centerY + Math.sin(microAngle) * microRadius,
    (Math.random() - 0.5) * nodeRadius * 0.2
  );
}
