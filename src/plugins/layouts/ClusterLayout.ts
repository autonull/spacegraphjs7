import * as THREE from 'three';
import { BaseLayout, type LayoutConfig, type LayoutOptions } from './BaseLayout';
import type { Node } from '../../nodes/Node';

export class ClusterLayout extends BaseLayout {
    readonly id = 'cluster-layout';
    readonly name = 'Cluster Layout';
    readonly version = '1.0.0';

    protected defaultConfig(): LayoutConfig {
        return {
            clusterBy: 'category',
            clusterRadius: 300,
            nodeRadius: 100,
            animate: true,
            duration: 1.5,
        };
    }

    async apply(options?: LayoutOptions): Promise<void> {
        const {
            clusterBy = this.config.clusterBy as string,
            clusterRadius = this.config.clusterRadius as number,
            nodeRadius = this.config.nodeRadius as number,
            animate = this.config.animate ?? true,
            duration = this.config.duration ?? 1.5,
        } = options ?? {};

        const nodes = Array.from(this.graph.getNodes()).filter(
            (n) => !(n.data as Record<string, unknown>).pinned,
        );
        if (!nodes.length) return;

        const clusters = new Map<string, Node[]>();
        for (const node of nodes) {
            const key =
                node.data?.[clusterBy] != null ? String(node.data[clusterBy]) : 'Uncategorized';
            if (!clusters.has(key)) clusters.set(key, []);
            clusters.get(key)!.push(node as Node);
        }

        const clusterKeys = [...clusters.keys()];
        const numClusters = clusterKeys.length;
        const targetPos = new THREE.Vector3();

for (const [clusterIndex, key] of clusterKeys.entries()) {
      const clusterNodes = clusters.get(key)!;
      const numNodes = clusterNodes.length;
      const macroAngle = (Math.PI * 2 * clusterIndex) / numClusters;
      const macroR = numClusters > 1 ? clusterRadius : 0;
      const centerX = Math.cos(macroAngle) * macroR;
      const centerY = Math.sin(macroAngle) * macroR;

      for (const [nodeIndex, node] of clusterNodes.entries()) {
        if (numNodes === 1) {
          targetPos.set(centerX, centerY, 0);
        } else if (numNodes < 10) {
          const microAngle = (Math.PI * 2 * nodeIndex) / numNodes;
          targetPos.set(
            centerX + Math.cos(microAngle) * nodeRadius,
            centerY + Math.sin(microAngle) * nodeRadius,
            0,
          );
        } else {
          const phi = (1 + Math.sqrt(5)) / 2;
          const microAngle = (nodeIndex * 2 * Math.PI) / (phi * phi);
          const microR = nodeRadius * Math.sqrt(nodeIndex / numNodes);
          targetPos.set(
            centerX + Math.cos(microAngle) * microR,
            centerY + Math.sin(microAngle) * microR,
            (Math.random() - 0.5) * nodeRadius * 0.2,
          );
        }
        this.applyPosition(node, targetPos, { animate, duration });
      }
    }

        this.updateEdges();
    }
}
