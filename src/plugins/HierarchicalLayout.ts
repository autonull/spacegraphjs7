import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import type { Node } from '../nodes/Node';

/**
 * HierarchicalLayout — Top-down tree layout.
 *
 * Builds a tree from the graph's edge list by doing a BFS from root(s), then
 * assigns X/Y positions layer-by-layer.
 *
 * Plugin settings:
 *   rootId       : ID of the designated root node. If empty, the node with
 *                  no incoming edges is used; if none such exists, the first node.
 *   levelHeight  : vertical spacing between levels (default 200)
 *   nodeSpacing  : minimum horizontal spacing between sibling nodes (default 150)
 *   z            : constant Z (default 0)
 *   direction    : 'top-down' | 'bottom-up' | 'left-right' | 'right-left' (default 'top-down')
 */
export class HierarchicalLayout implements ISpaceGraphPlugin {
    readonly id = 'hierarchical-layout';
    readonly name = 'Hierarchical Layout';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    public settings = {
        rootId: '',
        levelHeight: 200,
        nodeSpacing: 150,
        z: 0,
        direction: 'top-down' as 'top-down' | 'bottom-up' | 'left-right' | 'right-left',
    };

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

    apply(): void {
        const nodeMap = this.sg.graph.nodes;
        const edges = this.sg.graph.edges;
        if (!nodeMap.size) return;

        // Build adjacency: parent → children
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

        // BFS to assign levels
        const level: Map<string, number> = new Map();
        const queue: string[] = [rootId];
        level.set(rootId, 0);
        const visited = new Set<string>([rootId]);

        while (queue.length) {
            const cur = queue.shift()!;
            for (const child of children.get(cur) ?? []) {
                if (!visited.has(child)) {
                    visited.add(child);
                    level.set(child, (level.get(cur) ?? 0) + 1);
                    queue.push(child);
                }
            }
        }

        // Group by level
        const byLevel: Map<number, string[]> = new Map();
        for (const [id, lv] of level) {
            if (!byLevel.has(lv)) byLevel.set(lv, []);
            byLevel.get(lv)!.push(id);
        }

        // Assign positions
        const { levelHeight, nodeSpacing, z, direction } = this.settings;

        for (const [lv, ids] of byLevel) {
            const totalWidth = (ids.length - 1) * nodeSpacing;
            ids.forEach((id, i) => {
                const node = nodeMap.get(id) as Node;
                const primary = lv * levelHeight;
                const secondary = -totalWidth / 2 + i * nodeSpacing;

                let x: number, y: number;
                switch (direction) {
                    case 'bottom-up':
                        x = secondary;
                        y = primary;
                        break;
                    case 'left-right':
                        x = primary;
                        y = secondary;
                        break;
                    case 'right-left':
                        x = -primary;
                        y = secondary;
                        break;
                    default: // top-down
                        x = secondary;
                        y = -primary;
                }
                node.updatePosition(x, y, z);
            });
        }

        // Handle disconnected nodes (not visited in BFS)
        let orphanX = 0;
        for (const [id, node] of nodeMap) {
            if (!visited.has(id)) {
                (node as Node).updatePosition(
                    orphanX,
                    -(Math.max(...level.values()) + 1) * levelHeight,
                    z,
                );
                orphanX += nodeSpacing;
            }
        }

        for (const edge of edges) edge.update?.();
    }

    onPreRender(_delta: number): void {}
}
