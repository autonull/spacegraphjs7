import * as THREE from 'three';
import type { ISpaceGraphPlugin } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export class ClusterLayout implements ISpaceGraphPlugin {
    readonly id = 'cluster-layout';
    readonly name = 'Cluster Layout';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    public settings = {
        clusterBy: 'category', // Name of the property in node.data
        clusterRadius: 300,    // Radius of the circle of clusters
        nodeRadius: 100,       // Radius within each cluster
        animate: true,
        animationDuration: 1.5,
    };

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

    public apply(): void {
        const nodes = Array.from(this.sg.graph.nodes.values());
        if (nodes.length === 0) return;

        // Group nodes by cluster key
        const clusters = new Map<string, any[]>();
        nodes.forEach(node => {
            const key = (node.data && node.data[this.settings.clusterBy])
                ? String(node.data[this.settings.clusterBy])
                : 'Uncategorized';

            if (!clusters.has(key)) {
                clusters.set(key, []);
            }
            clusters.get(key)!.push(node);
        });

        // 1. Arrange clusters in a macro-circle
        const clusterKeys = Array.from(clusters.keys());
        const numClusters = clusterKeys.length;

        const targetPos = new THREE.Vector3();

        for (let clusterIndex = 0; clusterIndex < clusterKeys.length; clusterIndex++) {
            const key = clusterKeys[clusterIndex];
            const clusterNodes = clusters.get(key)!;
            const numNodes = clusterNodes.length;

            // Macro position for the center of this cluster
            const macroAngle = (Math.PI * 2 * clusterIndex) / numClusters;
            // If there's only 1 cluster, just put it at the center
            const macroR = numClusters > 1 ? this.settings.clusterRadius : 0;

            const centerX = Math.cos(macroAngle) * macroR;
            const centerY = Math.sin(macroAngle) * macroR;

            // 2. Arrange nodes inside the cluster in a micro-circle or pack
            for (let nodeIndex = 0; nodeIndex < numNodes; nodeIndex++) {
                const node = clusterNodes[nodeIndex];

                if (numNodes === 1) {
                    targetPos.set(centerX, centerY, 0);
                } else {
                    // Micro position relative to cluster center
                    // We can use a spiral or a simple circle. Let's use a circle / sunflower seed arrangement

                    // Simple circle if small, otherwise phyllotaxis spiral
                    if (numNodes < 10) {
                        const microAngle = (Math.PI * 2 * nodeIndex) / numNodes;
                        const microR = this.settings.nodeRadius;
                        targetPos.set(
                            centerX + Math.cos(microAngle) * microR,
                            centerY + Math.sin(microAngle) * microR,
                            0
                        );
                    } else {
                        // Sunflower spiral for higher density packing
                        const phi = (1 + Math.sqrt(5)) / 2; // golden ratio
                        const microAngle = nodeIndex * 2 * Math.PI / (phi * phi);
                        // sqrt(index) ensures uniform area density
                        const microR = this.settings.nodeRadius * Math.sqrt(nodeIndex / numNodes);

                        targetPos.set(
                            centerX + Math.cos(microAngle) * microR,
                            centerY + Math.sin(microAngle) * microR,
                            // Optionally add slightly randomized Z depth for 3D look
                            (Math.random() - 0.5) * (this.settings.nodeRadius * 0.2)
                        );
                    }
                }

                (node as any).applyPosition(
                    targetPos,
                    this.settings.animate,
                    this.settings.animationDuration,
                    clusterIndex * 0.1 // Stagger animation grouped by cluster
                );
            }
        }
    }

    dispose(): void { }
}
