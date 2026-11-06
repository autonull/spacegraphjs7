import { Vector3 } from 'three';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface RadialLayoutOptions extends LayoutOptions {
    rootId: string;
    baseRadius: number;
    /** Radial step between depths. Optional: when unset, auto-computed from max node height in level + padding. */
    radiusStep?: number;
    z: number;
    startAngle: number;
    /** Extra padding between nodes. Default: 20. */
    nodePadding?: number;
}

export class RadialLayout extends BaseLayout<RadialLayoutOptions> {
    readonly id = 'radial-layout';
    readonly name = 'Radial Layout';
    readonly version = '1.0.0';

    /** The radial tree owns every node: it places the pinned ones too. */
    protected override readonly ownsEveryNode = true;

    protected place(_nodes: Node[], config: RadialLayoutOptions): void {
        const { nodes } = this.graph;
        if (!nodes.size) return;

        const { children, rootId: resolvedRootId } = this.buildTree(config.rootId);
        const root = nodes.get(resolvedRootId) as Node;
        this.applyPosition(root, new Vector3(0, 0, config.z));

        const padding = config.nodePadding ?? 20;

        // First pass: compute max height per depth for auto radiusStep
        const maxHeightByDepth = new Map<number, number>();
        const computeDepthHeights = (id: string, depth: number): void => {
            const node = nodes.get(id);
            if (node) {
                const bounds = node.getLayoutBounds();
                const currentMax = maxHeightByDepth.get(depth) ?? 0;
                if (bounds.height > currentMax) maxHeightByDepth.set(depth, bounds.height);
            }
            for (const child of children.get(id) ?? []) {
                computeDepthHeights(child, depth + 1);
            }
        };
        computeDepthHeights(resolvedRootId, 0);

        const radiusStep = config.radiusStep ?? (maxHeightByDepth.get(1) ?? 0) + padding;

        const queue: Array<{ id: string; depth: number; minAngle: number; maxAngle: number }> = [
            {
                id: resolvedRootId,
                depth: 0,
                minAngle: config.startAngle,
                maxAngle: config.startAngle + 2 * Math.PI,
            },
        ];
        const visited = new Set<string>([resolvedRootId]);

        while (queue.length) {
            const { id, depth, minAngle, maxAngle } = queue.shift()!;
            const nodeChildren = (children.get(id) ?? []).filter((child) => !visited.has(child));
            if (!nodeChildren.length) continue;

            // Compute angular shares proportional to (node width + padding)
            const shares: number[] = [];
            let totalShare = 0;
            for (const childId of nodeChildren) {
                const node = nodes.get(childId);
                const bounds = node?.getLayoutBounds() ?? { width: 200, height: 100, depth: 1 };
                const share = bounds.width + padding;
                shares.push(share);
                totalShare += share;
            }

            const radius = config.baseRadius + depth * radiusStep;
            let currentAngle = minAngle;

            for (const [i, childId] of nodeChildren.entries()) {
                visited.add(childId);
                // Angular share proportional to (node width + padding) / totalShare
                const share = shares[i] / totalShare;
                const angle = currentAngle + share * (maxAngle - minAngle) / 2;
                currentAngle += share * (maxAngle - minAngle);

                const node = nodes.get(childId);
                if (node) {
                    this.applyPosition(
                        node,
                        new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, config.z),
                    );
                }
                queue.push({
                    id: childId,
                    depth: depth + 1,
                    minAngle: currentAngle - share * (maxAngle - minAngle),
                    maxAngle: currentAngle,
                });
            }
        }

        const orphans = [...nodes.keys()].filter((id) => !visited.has(id));
        if (orphans.length) {
            // Compute shares for orphans too
            const shares: number[] = [];
            let totalShare = 0;
            for (const id of orphans) {
                const node = nodes.get(id);
                const bounds = node?.getLayoutBounds() ?? { width: 200, height: 100, depth: 1 };
                const share = bounds.width + padding;
                shares.push(share);
                totalShare += share;
            }

            const outerRadius = config.baseRadius + nodes.size * radiusStep;
            let currentAngle = config.startAngle;
            for (const [i, id] of orphans.entries()) {
                const share = shares[i] / totalShare;
                const angle = currentAngle + share * Math.PI;
                currentAngle += share * 2 * Math.PI;

                this.applyPosition(
                    nodes.get(id) as Node,
                    new Vector3(
                        Math.cos(angle) * outerRadius,
                        Math.sin(angle) * outerRadius,
                        config.z,
                    ),
                );
            }
        }
    }

    protected defaultConfig(): RadialLayoutOptions {
        return {
            rootId: '',
            baseRadius: 200,
            z: 0,
            startAngle: 0,
            animate: true,
            duration: 1.0,
            nodePadding: 20,
        };
    }
}
