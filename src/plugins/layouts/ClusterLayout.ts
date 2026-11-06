import { Vector3 } from 'three';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface ClusterLayoutOptions extends LayoutOptions {
    clusterBy: string;
    /** Macro radius between cluster centers. Optional: when unset, auto-scaled so clusters don't overlap. */
    clusterRadius?: number;
    /** Micro radius within a cluster. Optional: when unset, auto-computed from max member size + padding. */
    nodeRadius?: number;
    /** Extra padding between nodes. Default: 20. */
    nodePadding?: number;
}

export class ClusterLayout extends BaseLayout<ClusterLayoutOptions> {
    readonly id = 'cluster-layout';
    readonly name = 'Cluster Layout';
    readonly version = '1.0.0';

    protected place(nodes: Node[], config: ClusterLayoutOptions): void {
        const clusters = new Map<string, Node[]>();
        for (const node of nodes) {
            const key =
                node.data?.[config.clusterBy] != null
                    ? String(node.data[config.clusterBy])
                    : 'Uncategorized';
            const bucket = clusters.get(key);
            if (bucket) bucket.push(node);
            else clusters.set(key, [node]);
        }

        const padding = config.nodePadding ?? 20;

        // Compute auto nodeRadius (micro-ring) per cluster: max member radius + padding
        const clusterNodeRadius = new Map<string, number>();
        for (const [key, clusterNodes] of clusters) {
            let maxRadius = 0;
            for (const node of clusterNodes) {
                const bounds = node.getLayoutBounds();
                const radius = Math.max(bounds.width, bounds.height) / 2 + padding;
                if (radius > maxRadius) maxRadius = radius;
            }
            // Floor at config.nodeRadius if provided
            clusterNodeRadius.set(key, config.nodeRadius !== undefined ? Math.max(config.nodeRadius, maxRadius) : maxRadius);
        }

        // Compute auto clusterRadius (macro): scale so adjacent clusters' outer extents don't overlap
        let clusterRadius = config.clusterRadius;
        const clusterGroups = [...clusters.values()];
        if (clusterRadius === undefined && clusterGroups.length > 1) {
            // Need at least sum of adjacent cluster radii to avoid overlap
            let requiredRadius = 0;
            for (let i = 0; i < clusterGroups.length; i++) {
                const currKey = [...clusters.keys()][i];
                const nextKey = [...clusters.keys()][(i + 1) % clusterGroups.length];
                const currMicroRadius = clusterNodeRadius.get(currKey) ?? 0;
                const nextMicroRadius = clusterNodeRadius.get(nextKey) ?? 0;
                requiredRadius = Math.max(requiredRadius, currMicroRadius + nextMicroRadius);
            }
            clusterRadius = requiredRadius;
        } else if (clusterRadius === undefined) {
            clusterRadius = 0;
        }

        const target = new Vector3();
        for (const [clusterIndex, clusterNodes] of clusterGroups.entries()) {
            const macroAngle = (Math.PI * 2 * clusterIndex) / clusterGroups.length;
            const macroRadius = clusterGroups.length > 1 ? clusterRadius! : 0;
            const centerX = Math.cos(macroAngle) * macroRadius;
            const centerY = Math.sin(macroAngle) * macroRadius;

            const clusterKey = [...clusters.keys()][clusterIndex];
            const microRadius = clusterNodeRadius.get(clusterKey) ?? 0;

            for (const [nodeIndex, node] of clusterNodes.entries()) {
                this.applyPosition(
                    node,
                    clusterOffset(
                        target,
                        centerX,
                        centerY,
                        nodeIndex,
                        clusterNodes.length,
                        microRadius,
                    ),
                );
            }
        }
    }

    protected defaultConfig(): ClusterLayoutOptions {
        return {
            clusterBy: 'category',
            animate: true,
            duration: 1.5,
            nodePadding: 20,
        };
    }
}

/** A node's place inside its cluster: one node sits on the centre, a few ring it, many spread out. */
function clusterOffset(
    target: Vector3,
    centerX: number,
    centerY: number,
    nodeIndex: number,
    nodeCount: number,
    nodeRadius: number,
): Vector3 {
    if (nodeCount === 1) return target.set(centerX, centerY, 0);
    if (nodeCount < 10) {
        const microAngle = (Math.PI * 2 * nodeIndex) / nodeCount;
        return target.set(
            centerX + Math.cos(microAngle) * nodeRadius,
            centerY + Math.sin(microAngle) * nodeRadius,
            0,
        );
    }
    const phi = (1 + Math.sqrt(5)) / 2;
    const microAngle = (nodeIndex * 2 * Math.PI) / (phi * phi);
    const microRadius = nodeRadius * Math.sqrt(nodeIndex / nodeCount);
    return target.set(
        centerX + Math.cos(microAngle) * microRadius,
        centerY + Math.sin(microAngle) * microRadius,
        (Math.random() - 0.5) * nodeRadius * 0.2,
    );
}
