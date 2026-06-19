import type { Node } from '../../nodes/Node';
import type { Edge } from '../../edges/Edge';
import type { Finger } from '../Fingering';
import { BaseFingering } from './BaseFingering';

export class HoverFingering extends BaseFingering {
    private hoveredNode: Node | null = null;
    private hoveredEdge: Edge | null = null;

    start(_finger: Finger): boolean {
        return false;
    }

    update(_finger: Finger): boolean {
        const nodeResult = this.raycaster.raycastNode();
        const edgeResult = this.raycaster.raycastEdge();

        if (nodeResult?.node !== this.hoveredNode) {
            if (this.hoveredNode) {
                this.emit('node:pointerleave', { node: this.hoveredNode });
            }
            this.hoveredNode = nodeResult?.node ?? null;
            if (this.hoveredNode) {
                this.emit('node:pointerenter', { node: this.hoveredNode });
            }
        }

        if (edgeResult?.edge !== this.hoveredEdge) {
            if (this.hoveredEdge) {
                this.emit('edge:pointerleave', { edge: this.hoveredEdge });
            }
            this.hoveredEdge = edgeResult?.edge ?? null;
            if (this.hoveredEdge) {
                this.emit('edge:pointerenter', { edge: this.hoveredEdge });
            }
        }

        return true;
    }

    stop(_finger: Finger): void {
        if (this.hoveredNode) {
            this.emit('node:pointerleave', { node: this.hoveredNode });
        }
        if (this.hoveredEdge) {
            this.emit('edge:pointerleave', { edge: this.hoveredEdge });
        }
        this.hoveredNode = null;
        this.hoveredEdge = null;
    }

    getHoveredNode(): Node | null {
        return this.hoveredNode;
    }

    getHoveredEdge(): Edge | null {
        return this.hoveredEdge;
    }
}