import { Vector3 } from 'three';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface TreeLayoutOptions extends LayoutOptions {
    /** Vertical distance between levels. Optional: when unset, auto-computed from max node height in level + padding. */
    levelHeight?: number;
    /** Horizontal spacing between leaf nodes. Optional: when unset, auto-computed from node width + padding. */
    nodeSpacing?: number;
    /** Extra padding between nodes. Default: 20. */
    nodePadding?: number;
    orientation: string;
}

export class TreeLayout extends BaseLayout<TreeLayoutOptions> {
    readonly id = 'tree-layout';
    readonly name = 'Tree Layout';
    readonly version = '1.0.0';

    /** The tree owns every node: it places the pinned ones too. */
    protected override readonly ownsEveryNode = true;

    protected place(nodes: Node[], config: TreeLayoutOptions): void {
        const children = new Map<string, Node[]>();
        const inDegree = new Map<string, number>();
        for (const node of nodes) {
            inDegree.set(node.id, 0);
            children.set(node.id, []);
        }
        for (const edge of this.graph.getEdges()) {
            inDegree.set(edge.target.id, (inDegree.get(edge.target.id) ?? 0) + 1);
            children.get(edge.source.id)?.push(edge.target);
        }

        const roots = nodes.filter((node) => inDegree.get(node.id) === 0);
        if (!roots.length) roots.push(nodes[0]);

        const padding = config.nodePadding ?? 20;

        // First pass: compute max height per level for auto levelHeight
        const maxHeightByLevel = new Map<number, number>();
        const computeLevelHeights = (node: Node, depth: number): void => {
            const bounds = node.getLayoutBounds();
            const currentMax = maxHeightByLevel.get(depth) ?? 0;
            if (bounds.height > currentMax) maxHeightByLevel.set(depth, bounds.height);
            for (const child of children.get(node.id) ?? []) {
                computeLevelHeights(child, depth + 1);
            }
        };
        for (const root of roots) {
            computeLevelHeights(root, 0);
        }

        const positions = new Map<string, Vector3>();
        let cursor = 0;

        const assignPositions = (node: Node, depth: number): void => {
            const nodeChildren = children.get(node.id) ?? [];
            if (!nodeChildren.length) {
                const bounds = node.getLayoutBounds();
                const spacing = config.nodeSpacing ?? Math.max(bounds.width + padding, 1);
                positions.set(node.id, new Vector3(cursor, -depth * (config.levelHeight ?? (maxHeightByLevel.get(depth) ?? 0) + padding), 0));
                cursor += spacing;
                return;
            }
            const childXs = nodeChildren.map((child) => {
                assignPositions(child, depth + 1);
                return positions.get(child.id)?.x ?? 0;
            });
            const minX = Math.min(...childXs);
            const maxX = Math.max(...childXs);
            const levelHeight = config.levelHeight ?? (maxHeightByLevel.get(depth) ?? 0) + padding;
            positions.set(node.id, new Vector3((minX + maxX) / 2, -depth * levelHeight, 0));
        };

        for (const root of roots) {
            assignPositions(root, 0);
            const rootBounds = root.getLayoutBounds();
            const rootSpacing = config.nodeSpacing ?? Math.max(rootBounds.width + padding, 1);
            cursor += rootSpacing * 2;
        }

        const centre = average(positions);
        const finalPos = new Vector3();
        for (const [id, position] of positions) {
            finalPos.set(position.x - centre.x, position.y - centre.y, 0);
            if (config.orientation === 'horizontal') finalPos.set(-finalPos.y, -finalPos.x, 0);
            this.applyPosition(this.graph.getNode(id) as Node, finalPos);
        }
    }

    protected defaultConfig(): TreeLayoutOptions {
        return {
            orientation: 'vertical',
            animate: true,
            duration: 1.0,
            nodePadding: 20,
        };
    }
}

function average(positions: Map<string, Vector3>): { x: number; y: number } {
    let sumX = 0;
    let sumY = 0;
    for (const position of positions.values()) {
        sumX += position.x;
        sumY += position.y;
    }
    const count = positions.size || 1;
    return { x: sumX / count, y: sumY / count };
}
