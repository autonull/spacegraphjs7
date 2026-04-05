import * as THREE from 'three';
import { BaseLayout, type LayoutConfig, type LayoutOptions } from './BaseLayout';
import type { Node } from '../../nodes/Node';
import type { Edge } from '../../edges/Edge';

export class RadialLayout extends BaseLayout {
    readonly id = 'radial-layout';
    readonly name = 'Radial Layout';
    readonly version = '1.0.0';

    protected defaultConfig(): LayoutConfig {
        return {
            rootId: '',
            baseRadius: 200,
            radiusStep: 180,
            z: 0,
            startAngle: 0,
            animate: true,
            duration: 1.0,
        };
    }

    async apply(options?: LayoutOptions): Promise<void> {
        const {
            rootId = this.config.rootId as string,
            baseRadius = this.config.baseRadius as number,
            radiusStep = this.config.radiusStep as number,
            z = this.config.z as number,
            startAngle = this.config.startAngle as number,
            animate = this.config.animate ?? true,
            duration = this.config.duration ?? 1.0,
        } = options ?? {};

        const { nodes, edges } = this.graph;
        if (!nodes.size) return;

        const children: Map<string, string[]> = new Map();
        const hasParent: Set<string> = new Set();
        for (const [id] of nodes) children.set(id, []);
        for (const edge of edges.values()) {
            children.get(edge.source.id)?.push(edge.target.id);
            hasParent.add(edge.target.id);
        }

        let resolvedRootId = rootId;
        if (!resolvedRootId || !nodes.has(resolvedRootId)) {
            const keys = [...nodes.keys()];
            resolvedRootId = keys.find((id) => !hasParent.has(id)) ?? keys[0];
        }

        const root = nodes.get(resolvedRootId) as Node;
        this.applyPosition(root, new THREE.Vector3(0, 0, z), { animate, duration });

        interface QueueItem { id: string; depth: number; minAngle: number; maxAngle: number; }
        const queue: QueueItem[] = [{ id: resolvedRootId, depth: 0, minAngle: startAngle, maxAngle: startAngle + 2 * Math.PI }];
        const visited = new Set<string>([resolvedRootId]);

        while (queue.length) {
            const { id, depth, minAngle, maxAngle } = queue.shift()!;
            const nodeChildren = (children.get(id) ?? []).filter((c) => !visited.has(c));
            if (!nodeChildren.length) continue;

            const angleStep = (maxAngle - minAngle) / nodeChildren.length;
            const radius = baseRadius + depth * radiusStep;

            nodeChildren.forEach((childId, i) => {
                visited.add(childId);
                const angle = minAngle + (i + 0.5) * angleStep;
                const node = nodes.get(childId) as Node;
                if (node) {
                    this.applyPosition(node, new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, z), { animate, duration });
                }
                queue.push({ id: childId, depth: depth + 1, minAngle: minAngle + i * angleStep, maxAngle: minAngle + (i + 1) * angleStep });
            });
        }

        const orphans = [...nodes.keys()].filter((id) => !visited.has(id));
        if (orphans.length) {
            const outerR = baseRadius + nodes.size * radiusStep;
            orphans.forEach((id, i) => {
                const angle = ((2 * Math.PI) / orphans.length) * i;
                this.applyPosition(nodes.get(id) as Node, new THREE.Vector3(Math.cos(angle) * outerR, Math.sin(angle) * outerR, z), { animate, duration });
            });
        }

        for (const edge of edges.values()) (edge as Edge).update?.();
    }
}
