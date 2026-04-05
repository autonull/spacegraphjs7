import * as THREE from 'three';
import { BaseLayout, type LayoutConfig, type LayoutOptions } from './BaseLayout';
import type { Node } from '../../nodes/Node';
import type { Edge } from '../../edges/Edge';

export class TreeLayout extends BaseLayout {
    readonly id = 'tree-layout';
    readonly name = 'Tree Layout';
    readonly version = '1.0.0';

    protected defaultConfig(): LayoutConfig {
        return {
            levelHeight: 150,
            nodeSpacing: 100,
            orientation: 'vertical',
            animate: true,
            duration: 1.0,
        };
    }

    async apply(options?: LayoutOptions): Promise<void> {
        const {
            levelHeight = this.config.levelHeight as number,
            nodeSpacing = this.config.nodeSpacing as number,
            orientation = this.config.orientation as string,
            animate = this.config.animate ?? true,
            duration = this.config.duration ?? 1.0,
        } = options ?? {};

        const nodes = Array.from(this.graph.getNodes());
        const edges = Array.from(this.graph.getEdges());
        if (!nodes.length) return;

        const inDegree = new Map<string, number>();
        const childrenMap = new Map<string, Node[]>();
        for (const n of nodes) { inDegree.set(n.id, 0); childrenMap.set(n.id, []); }
        for (const e of edges) {
            if (e.source?.id && e.target?.id) {
                inDegree.set(e.target.id, (inDegree.get(e.target.id) ?? 0) + 1);
                childrenMap.get(e.source.id)?.push(e.target as Node);
            }
        }

        const roots = nodes.filter((n) => inDegree.get(n.id) === 0);
        if (!roots.length) roots.push(nodes[0]);

        const positions = new Map<string, THREE.Vector3>();
        let currentX = 0;

        const assignPositions = (node: Node, depth: number) => {
            const nodeChildren = childrenMap.get(node.id) ?? [];
            if (!nodeChildren.length) {
                positions.set(node.id, new THREE.Vector3(currentX, -depth * levelHeight, 0));
                currentX += nodeSpacing;
            } else {
                let minX = Infinity, maxX = -Infinity;
                for (const child of nodeChildren) {
                    assignPositions(child, depth + 1);
                    const cp = positions.get(child.id);
                    if (cp) { minX = Math.min(minX, cp.x); maxX = Math.max(maxX, cp.x); }
                }
                positions.set(node.id, new THREE.Vector3((minX + maxX) / 2, -depth * levelHeight, 0));
            }
        };

        for (const root of roots) { assignPositions(root, 0); currentX += nodeSpacing * 2; }

        let sumX = 0, sumY = 0;
        for (const p of positions.values()) { sumX += p.x; sumY += p.y; }
        const offsetX = sumX / positions.size, offsetY = sumY / positions.size;
        const finalPos = new THREE.Vector3();

        for (const [id, pos] of positions) {
            finalPos.set(pos.x - offsetX, pos.y - offsetY, 0);
            if (orientation === 'horizontal') finalPos.set(-finalPos.y, -finalPos.x, 0);
            this.applyPosition(this.graph.getNode(id) as Node, finalPos, { animate, duration });
        }

        for (const edge of edges) (edge as Edge).update?.();
    }
}
