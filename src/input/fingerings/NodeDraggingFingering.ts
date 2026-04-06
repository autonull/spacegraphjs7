import * as THREE from 'three';
import type { SpaceGraph } from '../../SpaceGraph';
import type { Node } from '../../nodes/Node';
import type { Finger, Fingering } from '../Fingering';
import type { InteractionRaycaster } from '../../plugins/interaction/RaycasterHelper';

export class NodeDraggingFingering implements Fingering {
    private sg: SpaceGraph;
    private raycaster: InteractionRaycaster;
    private dragNode: Node | null = null;
    private dragPlane = new THREE.Plane();
    private dragOffset = new THREE.Vector3();
    private startPos = { x: 0, y: 0 };
    private active = false;
    private draggingNodes = new Set<Node>();
    private nodeOffsets = new Map<Node, THREE.Vector3>();

    constructor(sg: SpaceGraph, raycaster: InteractionRaycaster) {
        this.sg = sg;
        this.raycaster = raycaster;
    }

    start(finger: Finger): boolean {
        if (finger.buttons !== 1) return false;

        const result = this.raycaster.raycastNode();
        if (!result?.node) return false;

        const localPos = result.point.clone();
        if (!result.node.isDraggable(localPos)) return false;

        this.dragNode = result.node;
        this.startPos = { x: finger.position.x, y: finger.position.y };

        this.dragPlane.setFromNormalAndCoplanarPoint(
            this.sg.renderer.camera.getWorldDirection(new THREE.Vector3()),
            result.node.position,
        );

        const intersect = this.raycaster.raycastPlane(this.dragPlane);
        if (intersect) {
            this.dragOffset.copy(intersect).sub(result.node.position);
        }

        this.dragNode.pulse(1.0);
        this.active = true;
        this.sg.events.emit('interaction:dragstart', { node: this.dragNode });
        return true;
    }

    update(finger: Finger): boolean {
        if (!this.active || !this.dragNode) return false;

        const intersect = this.raycaster.raycastPlane(this.dragPlane);
        if (!intersect) return false;

        const targetPos = intersect.sub(this.dragOffset);
        this.dragNode.position.copy(targetPos);
        this.dragNode.object?.updateMatrixWorld(true);

        this.sg.events.emit('interaction:drag', {
            node: this.dragNode,
            position: [targetPos.x, targetPos.y, targetPos.z] as [number, number, number],
        });

        return true;
    }

    stop(finger: Finger): void {
        if (this.dragNode) {
            this.sg.events.emit('interaction:dragend', { node: this.dragNode });
        }
        this.active = false;
        this.dragNode = null;
        this.draggingNodes.clear();
        this.nodeOffsets.clear();
    }

    defer(_finger: Finger): boolean {
        return true;
    }
}
