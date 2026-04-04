import * as THREE from 'three';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { Plugin } from '../core/PluginManager';
import type { Graph } from '../core/Graph';
import type { EventSystem } from '../core/events/EventSystem';

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
export class HierarchicalLayout implements Plugin {
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
        animate: true,
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

        const level = new Map<string, number>();
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

        const byLevel = new Map<number, string[]>();
        for (const [id, lv] of level) {
            if (!byLevel.has(lv)) byLevel.set(lv, []);
            byLevel.get(lv)!.push(id);
        }

        const { levelHeight, nodeSpacing, z, direction, animate } = this.settings;

        for (const [lv, ids] of byLevel) {
            const totalWidth = (ids.length - 1) * nodeSpacing;
            ids.forEach((id, i) => {
                const node = nodes.get(id) as Node;
                const primary = lv * levelHeight;
                const secondary = -totalWidth / 2 + i * nodeSpacing;

                const [x, y] = (() => {
                    switch (direction) {
                        case 'bottom-up':
                            return [secondary, primary];
                        case 'left-right':
                            return [primary, secondary];
                        case 'right-left':
                            return [-primary, secondary];
                        default:
                            return [secondary, -primary];
                    }
                })();

                node.applyPosition(new THREE.Vector3(x, y, z), { animate });
            });
        }

        let orphanX = 0;
        const maxLevel = Math.max(...level.values(), 0);
        for (const [id, node] of nodes) {
            if (!visited.has(id)) {
                (node as Node).updatePosition(orphanX, -(maxLevel + 1) * levelHeight, z);
                orphanX += nodeSpacing;
            }
        }

        for (const edge of edges.values()) edge.update?.();
    }
}
