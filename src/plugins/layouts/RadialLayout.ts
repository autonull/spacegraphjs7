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
}

export class RadialLayout extends BaseLayout<RadialLayoutOptions> {
    readonly id = 'radial-layout';
    readonly name = 'Radial Layout';

    /** The radial tree owns every node: it places the pinned ones too. */
    protected override readonly ownsEveryNode = true;

    protected place(_nodes: Node[], config: RadialLayoutOptions): void {
        const { nodes } = this.graph;
        if (!nodes.size) return;

        const { children, rootId: resolvedRootId } = this.buildTree(config.rootId);
        const root = nodes.get(resolvedRootId) as Node;
        this.applyPosition(root, new Vector3(0, 0, config.z));

        const padding = this.nodePadding(config);

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

        // One ring placement serves both tree children and orphans: each node gets an angular
        // share of the ring proportional to its width, and the caller decides which ring to use.
        const placeRing = (
            ids: readonly string[],
            radius: number,
            startAngle: number,
            span: number,
        ): { min: number; max: number }[] => {
            const shares = ids.map((id) => {
                const bounds = nodes.get(id)?.getLayoutBounds() ?? {
                    width: 200,
                    height: 100,
                    depth: 1,
                };
                return bounds.width + padding;
            });
            const total = shares.reduce((sum, share) => sum + share, 0);
            let cursor = startAngle;

            return ids.map((id, index) => {
                const min = cursor;
                const max = cursor + (shares[index]! / total) * span;
                const angle = (min + max) / 2;
                cursor = max;

                const node = nodes.get(id);
                if (node)
                    this.applyPosition(
                        node,
                        new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, config.z),
                    );
                return { min, max };
            });
        };

        const queue: Array<{ id: string; depth: number; minAngle: number; maxAngle: number }> = [
            {
                id: resolvedRootId,
                depth: 0,
                minAngle: config.startAngle,
                maxAngle: config.startAngle + 2 * Math.PI,
            },
        ];
        const visited = new Set<string>([resolvedRootId]);

        for (let head = 0; head < queue.length; head++) {
            const { id, depth, minAngle, maxAngle } = queue[head]!;
            const nodeChildren = (children.get(id) ?? []).filter((child) => !visited.has(child));
            if (!nodeChildren.length) continue;

            const radius = config.baseRadius + depth * radiusStep;
            const placed = placeRing(nodeChildren, radius, minAngle, maxAngle - minAngle);

            nodeChildren.forEach((childId, index) => {
                visited.add(childId);
                queue.push({
                    id: childId,
                    depth: depth + 1,
                    minAngle: placed[index]!.min,
                    maxAngle: placed[index]!.max,
                });
            });
        }

        const orphans = [...nodes.keys()].filter((id) => !visited.has(id));
        if (orphans.length)
            placeRing(orphans, config.baseRadius + nodes.size * radiusStep, config.startAngle, 2 * Math.PI);
    }

    protected defaultConfig(): RadialLayoutOptions {
        return {
            rootId: '',
            baseRadius: 200,
            z: 0,
            startAngle: 0,
            duration: 1.0,
        };
    }
}
