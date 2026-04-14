import * as THREE from 'three';
import type { SpaceGraph } from '../../SpaceGraph';
import type { Node } from '../../nodes/Node';
import type { Finger, Fingering } from '../Fingering';
import type { InteractionRaycaster } from '../../plugins/interaction/RaycasterHelper';

export class WidgetFingering implements Fingering {
    private sg: SpaceGraph;
    private raycaster: InteractionRaycaster;
    private widgetNode: Node | null = null;
    private isButtonDown = false;

    constructor(sg: SpaceGraph, raycaster: InteractionRaycaster) {
        this.sg = sg;
        this.raycaster = raycaster;
    }

    start(finger: Finger): boolean {
        if (finger.buttons !== 1) return false;

        const result = this.raycaster.raycastNode();
        if (!result?.node) return false;

        const node = result.node as any;
        if (typeof node.onPointerDown === 'function') {
            node.onPointerDown();
            this.widgetNode = node;
            this.isButtonDown = true;
            return true;
        }

        return false;
    }

    update(finger: Finger): boolean {
        if (!this.isButtonDown || !this.widgetNode) return true;

        const result = this.raycaster.raycastNode();
        if (
            result?.node === this.widgetNode &&
            typeof (this.widgetNode as any).onPointerMove === 'function'
        ) {
            const localPoint = this.widgetNode.object.worldToLocal(result.point.clone());
            (this.widgetNode as any).onPointerMove(localPoint.x);
        }

        return true;
    }

    stop(finger: Finger): void {
        if (this.isButtonDown && this.widgetNode) {
            const result = this.raycaster.raycastNode();
            if (
                result?.node === this.widgetNode &&
                typeof (this.widgetNode as any).onPointerUp === 'function'
            ) {
                (this.widgetNode as any).onPointerUp();
            }
        }
        this.isButtonDown = false;
        this.widgetNode = null;
    }

    defer(_finger: Finger): boolean {
        return true;
    }
}
