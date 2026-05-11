import type { SpaceGraph } from '../../SpaceGraph';
import type { Node } from '../../nodes/Node';
import type { Edge } from '../../edges/Edge';
import { applyControlStateStyles, type ControlState } from './ControlStateBorder';

export class HoverManager {
    private hoveredNode: Node | null = null;
    private hoveredEdge: Edge | null = null;
    private readonly HOVER_SCALE = 1.1;

    constructor(private readonly sg: SpaceGraph) {}

    updateHover(node: Node | null, edge: Edge | null): void {
        this.updateNodeHover(node);
        this.updateEdgeHover(edge);
    }

    public updateNodeHover(node: Node | null): void {
        if (node === this.hoveredNode) return;

        if (this.hoveredNode?.object) {
            this.sg.events.emit('node:pointerleave', { node: this.hoveredNode } as any);
            this.hoveredNode.object.scale.divideScalar(this.HOVER_SCALE);
            this.updateNodeState(this.hoveredNode, 'normal');
            this.hoveredNode.callbacks?.onPointerLeave?.(this.hoveredNode);
        }

        this.hoveredNode = node;

        if (this.hoveredNode?.object) {
            this.sg.events.emit('node:pointerenter', { node: this.hoveredNode } as any);
            this.hoveredNode.object.scale.multiplyScalar(this.HOVER_SCALE);
            this.updateNodeState(this.hoveredNode, 'hovered');
            this.hoveredNode.callbacks?.onPointerEnter?.(this.hoveredNode);
        }
    }

    private updateNodeState(node: Node, state: ControlState): void {
        const prevState = node.controlState;
        node.controlState = state;
        const el = node.object?.userData?.domElement;
        if (el) applyControlStateStyles(el as HTMLElement, state, prevState);
    }

    private updateEdgeHover(edge: Edge | null): void {
        if (edge === this.hoveredEdge) return;
        if (this.hoveredEdge) this.sg.events.emit('edge:pointerleave', { edge: this.hoveredEdge } as any);
        this.hoveredEdge = edge;
        if (this.hoveredEdge) this.sg.events.emit('edge:pointerenter', { edge: this.hoveredEdge } as any);
    }

    getHoveredNode(): Node | null { return this.hoveredNode; }
    getHoveredEdge(): Edge | null { return this.hoveredEdge; }
    clear(): void { this.updateHover(null, null); }
}