import type { SpaceGraph } from '../SpaceGraph';
import type { Node } from '../nodes/Node';
import type { Plugin } from '../core/PluginManager';
import type { Graph } from '../core/Graph';
import type { EventSystem } from '../core/events/EventSystem';

/**
 * RadialLayout — Positions the root node at the center and distributes
 * children at increasing radii by depth.
 *
 * Plugin settings:
 *   rootId      : designated root (auto-selected if empty)
 *   baseRadius  : radius for depth-1 nodes (default 200)
 *   radiusStep  : additional radius per depth level (default 180)
 *   z           : constant Z (default 0)
 *   startAngle  : starting angle in radians (default 0)
 */
export class RadialLayout implements Plugin {
    readonly id = 'radial-layout';
    readonly name = 'Radial Layout';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    public settings = {
        rootId: '',
        baseRadius: 200,
        radiusStep: 180,
        z: 0,
        startAngle: 0,
    };

    init(sg: SpaceGraph, _graph: Graph, _events: EventSystem): void {
        this.sg = sg;
    }

    apply(): void {
        const { nodes, edges } = this.sg.graph;
        if (!nodes.size) return;

        const children: Map<string, string[]> = new Map();
        const hasParent: Set<string> = new Set();
        for (const [id] of nodes) children.set(id, []);
        for (const edge of edges.values()) {
            children.get(edge.source.id)?.push(edge.target.id);
            hasParent.add(edge.target.id);
        }

        let rootId = this.settings.rootId;
        if (!rootId || !nodes.has(rootId)) {
            const keys = [...nodes.keys()];
            rootId = keys.find((id) => !hasParent.has(id)) ?? keys[0];
        }

        const { baseRadius, radiusStep, z, startAngle } = this.settings;
        const root = nodes.get(rootId) as Node;
        root.updatePosition(0, 0, z);

        interface QueueItem {
            id: string;
            depth: number;
            minAngle: number;
            maxAngle: number;
        }

        const queue: QueueItem[] = [
            {
                id: rootId,
                depth: 0,
                minAngle: startAngle,
                maxAngle: startAngle + 2 * Math.PI,
            },
        ];
        const visited = new Set<string>([rootId]);

        while (queue.length) {
            const { id, depth, minAngle, maxAngle } = queue.shift()!;
            const nodeChildren = (children.get(id) ?? []).filter((c) => !visited.has(c));
            if (!nodeChildren.length) continue;

            const angleStep = (maxAngle - minAngle) / nodeChildren.length;
            const radius = baseRadius + depth * radiusStep;

            nodeChildren.forEach((childId, i) => {
                visited.add(childId);
                const angle = minAngle + (i + 0.5) * angleStep;
                (nodes.get(childId) as Node)?.updatePosition(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius,
                    z,
                );
                queue.push({
                    id: childId,
                    depth: depth + 1,
                    minAngle: minAngle + i * angleStep,
                    maxAngle: minAngle + (i + 1) * angleStep,
                });
            });
        }

        const orphans = [...nodes.keys()].filter((id) => !visited.has(id));
        if (orphans.length) {
            const outerR = baseRadius + nodes.size * radiusStep;
            orphans.forEach((id, i) => {
                const angle = ((2 * Math.PI) / orphans.length) * i;
                (nodes.get(id) as Node).updatePosition(
                    Math.cos(angle) * outerR,
                    Math.sin(angle) * outerR,
                    z,
                );
            });
        }

        for (const edge of edges.values()) edge.update?.();
    }
}
