import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import type { Node } from '../nodes/Node';

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
export class RadialLayout implements ISpaceGraphPlugin {
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

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

    apply(): void {
        const nodeMap = this.sg.graph.nodes;
        const edges = this.sg.graph.edges;
        if (!nodeMap.size) return;

        // Build adjacency
        const children: Map<string, string[]> = new Map();
        const hasParent: Set<string> = new Set();
        for (const [id] of nodeMap) children.set(id, []);
        for (const edge of edges) {
            children.get(edge.source.id)?.push(edge.target.id);
            hasParent.add(edge.target.id);
        }

        // Pick root
        let rootId = this.settings.rootId;
        if (!rootId || !nodeMap.has(rootId)) {
            rootId = [...nodeMap.keys()].find((id) => !hasParent.has(id)) ?? [...nodeMap.keys()][0];
        }

        // Place root at center
        const root = nodeMap.get(rootId) as Node;
        root.updatePosition(0, 0, this.settings.z);

        // BFS with angular sector allocation
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
                minAngle: this.settings.startAngle,
                maxAngle: this.settings.startAngle + 2 * Math.PI,
            },
        ];
        const visited = new Set<string>([rootId]);

        while (queue.length) {
            const { id, depth, minAngle, maxAngle } = queue.shift()!;
            const nodeChildren = [];
            for (const c of (children.get(id) ?? [])) {
                if (!visited.has(c)) {
                    nodeChildren.push(c);
                }
            }
            if (!nodeChildren.length) continue;

            const angleStep = (maxAngle - minAngle) / nodeChildren.length;
            const radius = this.settings.baseRadius + depth * this.settings.radiusStep;

            for (let i = 0; i < nodeChildren.length; i++) {
                const childId = nodeChildren[i];
                visited.add(childId);
                const angle = minAngle + (i + 0.5) * angleStep;
                const childX = Math.cos(angle) * radius;
                const childY = Math.sin(angle) * radius;
                (nodeMap.get(childId) as Node)?.updatePosition(childX, childY, this.settings.z);
                queue.push({
                    id: childId,
                    depth: depth + 1,
                    minAngle: minAngle + i * angleStep,
                    maxAngle: minAngle + (i + 1) * angleStep,
                });
            }
        }

        // Orphan nodes in outer ring
        const orphans = [];
        for (const id of nodeMap.keys()) {
            if (!visited.has(id)) {
                orphans.push(id);
            }
        }
        const outerR = this.settings.baseRadius + nodeMap.size * this.settings.radiusStep;
        for (let i = 0; i < orphans.length; i++) {
            const id = orphans[i];
            const angle = ((2 * Math.PI) / Math.max(orphans.length, 1)) * i;
            (nodeMap.get(id) as Node).updatePosition(
                Math.cos(angle) * outerR,
                Math.sin(angle) * outerR,
                this.settings.z,
            );
        }

        for (const edge of edges) edge.update?.();
    }

    onPreRender(_delta: number): void {}
}
