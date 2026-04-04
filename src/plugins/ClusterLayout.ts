import * as THREE from 'three';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { Plugin } from '../core/PluginManager';
import type { Graph } from '../core/Graph';
import type { EventSystem } from '../core/events/EventSystem';

export class ClusterLayout implements Plugin {
    readonly id = 'cluster-layout';
    readonly name = 'Cluster Layout';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    public settings = {
        clusterBy: 'category',
        clusterRadius: 300,
        nodeRadius: 100,
        animate: true,
        animationDuration: 1.5,
    };

    init(sg: SpaceGraph, _graph: Graph, _events: EventSystem): void {
        this.sg = sg;
    }

    public apply(): void {
        const nodes = Array.from(this.sg.graph.nodes.values()).filter((n) => !n.data?.pinned);
        if (!nodes.length) return;

        const { clusterBy, clusterRadius, nodeRadius, animate, animationDuration } = this.settings;
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

        clusterKeys.forEach((key, clusterIndex) => {
            const clusterNodes = clusters.get(key)!;
            const numNodes = clusterNodes.length;
            const macroAngle = (Math.PI * 2 * clusterIndex) / numClusters;
            const macroR = numClusters > 1 ? clusterRadius : 0;
            const centerX = Math.cos(macroAngle) * macroR;
            const centerY = Math.sin(macroAngle) * macroR;

            clusterNodes.forEach((node, nodeIndex) => {
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

                node.applyPosition(targetPos, {
                    animate,
                    duration: animationDuration,
                    delay: clusterIndex * 0.1,
                });
            });
        });

        for (const edge of this.sg.graph.edges.values()) edge.update?.();
    }
}
