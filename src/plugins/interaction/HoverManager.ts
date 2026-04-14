import type { SpaceGraph } from '../../SpaceGraph';
import type { Node } from '../../nodes/Node';
import type { Edge } from '../../edges/Edge';

/**
 * Hover manager for InteractionPlugin
 * Consolidates hover state management and visual feedback
 */
export class HoverManager {
    private hoveredNode: Node | null = null;
    private hoveredEdge: Edge | null = null;
    private readonly sg: SpaceGraph;

    private static HOVER_SCALE = 1.1;

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    updateHover(node: Node | null, edge: Edge | null): void {
        this.updateNodeHover(node);
        this.updateEdgeHover(edge);
    }

    updateNodeHover(node: Node | null): void {
        if (node === this.hoveredNode) return;

        if (this.hoveredNode && this.hoveredNode.object) {
            this.sg.events.emit('node:pointerleave', { node: this.hoveredNode } as any);
            this.hoveredNode.object.scale.divideScalar(HoverManager.HOVER_SCALE);
            if (typeof this.hoveredNode.onPointerLeave === 'function') {
                this.hoveredNode.onPointerLeave();
            }
        }

        this.hoveredNode = node;

        if (this.hoveredNode && this.hoveredNode.object) {
            this.sg.events.emit('node:pointerenter', { node: this.hoveredNode } as any);
            this.hoveredNode.object.scale.multiplyScalar(HoverManager.HOVER_SCALE);
            if (typeof this.hoveredNode.onPointerEnter === 'function') {
                this.hoveredNode.onPointerEnter();
            }
        }
    }

    updateEdgeHover(edge: Edge | null): void {
        if (edge === this.hoveredEdge) return;

        if (this.hoveredEdge) {
            this.sg.events.emit('edge:pointerleave', { edge: this.hoveredEdge } as any);
        }

        this.hoveredEdge = edge;

        if (this.hoveredEdge) {
            this.sg.events.emit('edge:pointerenter', { edge: this.hoveredEdge } as any);
        }
    }

    getHoveredNode(): Node | null {
        return this.hoveredNode;
    }

    getHoveredEdge(): Edge | null {
        return this.hoveredEdge;
    }

    clear(): void {
        this.updateHover(null, null);
    }
}
