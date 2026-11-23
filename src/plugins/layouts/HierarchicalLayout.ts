import { Vector3 } from 'three';
import { DEFAULT_NODE_BOUNDS, declaredNodeBounds, type NodeBounds } from '../../layout/node-bounds';
import type { Node } from '../../nodes/Node';
import { appendTo } from '../../utils/collection';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

type BoundsCarrier = {
    data?: unknown;
    size?: unknown;
    getLayoutBounds?: () => NodeBounds;
};

/** Declared bounds, then a Node's own resolution, then the documented default. */
const getNodeBounds = (node: BoundsCarrier): NodeBounds =>
    declaredNodeBounds(node) ??
    (typeof node.getLayoutBounds === 'function' ? node.getLayoutBounds() : undefined) ??
    { ...DEFAULT_NODE_BOUNDS };

export interface HierarchicalLayoutOptions extends LayoutOptions {
    rootId: string;
    /** Vertical distance between levels. Optional: when unset, auto-computed from max node height in level + padding. */
    levelHeight?: number;
    /** Horizontal spacing between nodes. Optional: when unset, auto-computed from node width + padding. */
    nodeSpacing?: number;
    /** Extra padding between nodes. Default: 20. */
    nodePadding?: number;
    z: number;
    direction: string;
}

export class HierarchicalLayout extends BaseLayout<HierarchicalLayoutOptions> {
    readonly id = 'hierarchical-layout';
    readonly name = 'Hierarchical Layout';
    readonly version = '1.0.0';

    /** The hierarchy reads the whole graph; it leaves the pinned nodes where they are. */
    protected override readonly ownsEveryNode = true;

    protected place(nodes: Node[], config: HierarchicalLayoutOptions): void {
        const byId = new Map(nodes.map((node) => [node.id, node]));
        const { children, rootId: resolvedRootId } = this.buildTree(config.rootId);

        const level = new Map<string, number>();
        const queue: string[] = [resolvedRootId];
        level.set(resolvedRootId, 0);
        const visited = new Set<string>([resolvedRootId]);

        for (let head = 0; head < queue.length; head++) {
            const cur = queue[head]!;
            for (const child of children.get(cur) ?? []) {
                if (visited.has(child)) continue;
                visited.add(child);
                level.set(child, (level.get(cur) ?? 0) + 1);
                queue.push(child);
            }
        }

        const byLevel = new Map<number, string[]>();
        for (const [id, lv] of level) {
            appendTo(byLevel, lv, id);
        }

        const padding = config.nodePadding ?? 20;

        // Compute max height per level for auto levelHeight
        const maxHeightByLevel = new Map<number, number>();
        for (const [lv, ids] of byLevel) {
            let maxH = 0;
            for (const id of ids) {
                const node = byId.get(id);
                if (node) {
                    const bounds = getNodeBounds(node);
                    if (bounds.height > maxH) maxH = bounds.height;
                }
            }
            if (maxH > 0) maxHeightByLevel.set(lv, maxH);
        }

        for (const [lv, ids] of byLevel) {
            const placed = ids
                .filter((id) => byId.has(id))
                .filter((id) => !this.isPinned(byId.get(id)!));

            // Use cumulative cursor based on node widths instead of uniform spacing
            let cursor = 0;
            const levelHeight = config.levelHeight ?? (maxHeightByLevel.get(lv) ?? 0) + padding;

            for (const id of placed) {
                const node = byId.get(id)!;
                const bounds = getNodeBounds(node);
                const spacing = config.nodeSpacing ?? bounds.width + padding;

                const primary = lv * levelHeight;
                const secondary = cursor + spacing / 2; // center of the node
                const [x, y] = orient(primary, secondary, config.direction);
                this.applyPosition(node, new Vector3(x, y, config.z));

                cursor += spacing;
            }
        }

        let orphanX = 0;
        const maxLevel = Math.max(...level.values(), 0);
        const orphanLevelHeight = config.levelHeight ?? (maxHeightByLevel.get(maxLevel + 1) ?? 0) + padding;
        for (const node of nodes) {
            if (visited.has(node.id) || this.isPinned(node)) continue;
            const bounds = getNodeBounds(node);
            const spacing = config.nodeSpacing ?? bounds.width + padding;

            this.applyPosition(
                node,
                new Vector3(orphanX + spacing / 2, -(maxLevel + 1) * orphanLevelHeight, config.z),
            );
            orphanX += spacing;
        }
    }

    protected defaultConfig(): HierarchicalLayoutOptions {
        return {
            rootId: '',
            z: 0,
            direction: 'top-down',
            animate: true,
            duration: 1.0,
            nodePadding: 20,
        };
    }
}

/** The primary axis runs along the levels, the secondary across them; the direction picks the axes. */
function orient(primary: number, secondary: number, direction: string): [number, number] {
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
}
