import * as THREE from 'three';
import { BaseLayout, type LayoutConfig, type LayoutOptions } from './BaseLayout';
import type { Node } from '../../nodes/Node';

export class HierarchicalLayout extends BaseLayout {
    readonly id = 'hierarchical-layout';
    readonly name = 'Hierarchical Layout';
    readonly version = '1.0.0';

    protected defaultConfig(): LayoutConfig {
        return {
            rootId: '',
            levelHeight: 200,
            nodeSpacing: 150,
            z: 0,
            direction: 'top-down',
            animate: true,
            duration: 1.0,
        };
    }

    async apply(options?: LayoutOptions): Promise<void> {
        const {
            rootId = this.config.rootId as string,
            levelHeight = this.config.levelHeight as number,
            nodeSpacing = this.config.nodeSpacing as number,
            z = this.config.z as number,
            direction = this.config.direction as string,
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

        const level = new Map<string, number>();
        const queue: string[] = [resolvedRootId];
        level.set(resolvedRootId, 0);
        const visited = new Set<string>([resolvedRootId]);

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

        for (const [lv, ids] of byLevel) {
            const totalWidth = (ids.length - 1) * nodeSpacing;
for (const [i, id] of ids.entries()) {
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
      this.applyPosition(node, new THREE.Vector3(x, y, z), { animate, duration });
    }
        }

        let orphanX = 0;
        const maxLevel = Math.max(...level.values(), 0);
        for (const [id, node] of nodes) {
            if (!visited.has(id)) {
                this.applyPosition(
                    node as Node,
                    new THREE.Vector3(orphanX, -(maxLevel + 1) * levelHeight, z),
                    { animate: false },
                );
                orphanX += nodeSpacing;
            }
        }

        this.updateEdges();
    }
}
