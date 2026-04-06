import type { SpaceGraph } from '../../SpaceGraph';
import type { Node } from '../../nodes/Node';
import type { Edge } from '../../edges/Edge';
import type { Finger, Fingering } from '../Fingering';
import type { InteractionRaycaster } from '../../plugins/interaction/RaycasterHelper';

export class HoverFingering implements Fingering {
    private sg: SpaceGraph;
    private raycaster: InteractionRaycaster;
    private hoveredNode: Node | null = null;
    private hoveredEdge: Edge | null = null;

    constructor(sg: SpaceGraph, raycaster: InteractionRaycaster) {
        this.sg = sg;
        this.raycaster = raycaster;
    }

    start(_finger: Finger): boolean {
        return false;
    }

    update(finger: Finger): boolean {
        const nodeResult = this.raycaster.raycastNode();
        const edgeResult = this.raycaster.raycastEdge();

        if (nodeResult?.node !== this.hoveredNode) {
            if (this.hoveredNode) {
                this.sg.events.emit('node:pointerleave', { node: this.hoveredNode });
            }
            this.hoveredNode = nodeResult?.node ?? null;
            if (this.hoveredNode) {
                this.sg.events.emit('node:pointerenter', { node: this.hoveredNode });
            }
        }

        if (edgeResult?.edge !== this.hoveredEdge) {
            if (this.hoveredEdge) {
                this.sg.events.emit('edge:pointerleave', { edge: this.hoveredEdge });
            }
            this.hoveredEdge = edgeResult?.edge ?? null;
            if (this.hoveredEdge) {
                this.sg.events.emit('edge:pointerenter', { edge: this.hoveredEdge });
            }
        }

        return true;
    }

    stop(_finger: Finger): void {
        if (this.hoveredNode) {
            this.sg.events.emit('node:pointerleave', { node: this.hoveredNode });
        }
        if (this.hoveredEdge) {
            this.sg.events.emit('edge:pointerleave', { edge: this.hoveredEdge });
        }
        this.hoveredNode = null;
        this.hoveredEdge = null;
    }

    defer(_finger: Finger): boolean {
        return true;
    }

    getHoveredNode(): Node | null {
        return this.hoveredNode;
    }

    getHoveredEdge(): Edge | null {
        return this.hoveredEdge;
    }
}
