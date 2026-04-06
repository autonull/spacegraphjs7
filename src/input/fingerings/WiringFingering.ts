import * as THREE from 'three';
import type { SpaceGraph } from '../../SpaceGraph';
import type { Node } from '../../nodes/Node';
import type { EdgeSpec } from '../../types';
import type { Finger, Fingering } from '../Fingering';
import type { InteractionRaycaster } from '../../plugins/interaction/RaycasterHelper';

export class WiringFingering implements Fingering {
    private sg: SpaceGraph;
    private raycaster: InteractionRaycaster;
    private isConnecting = false;
    private sourceNode: Node | null = null;
    private tempLine: THREE.Line | null = null;
    private tempGeom: THREE.BufferGeometry | null = null;
    private readonly tempMaterial = new THREE.LineBasicMaterial({ color: 0x8b5cf6, linewidth: 2 });

    constructor(sg: SpaceGraph, raycaster: InteractionRaycaster) {
        this.sg = sg;
        this.raycaster = raycaster;
    }

    start(finger: Finger): boolean {
        if (finger.buttons !== 1) return false;

        const data = (finger as any).originalData;
        if (!data?.altKey) return false;

        const result = this.raycaster.raycastNode();
        if (!result?.node) return false;

        this.isConnecting = true;
        this.sourceNode = result.node;

        const positions = new Float32Array([
            this.sourceNode.position.x,
            this.sourceNode.position.y,
            this.sourceNode.position.z,
            this.sourceNode.position.x,
            this.sourceNode.position.y,
            this.sourceNode.position.z,
        ]);

        this.tempGeom = new THREE.BufferGeometry();
        this.tempGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        this.tempLine = new THREE.Line(this.tempGeom, this.tempMaterial);
        this.sg.renderer.scene.add(this.tempLine);

        this.sourceNode.pulse(1.0);
        this.sg.events.emit('connection:start', { node: this.sourceNode });
        return true;
    }

    update(finger: Finger): boolean {
        if (!this.isConnecting || !this.sourceNode || !this.tempGeom) return false;

        const normal = this.sg.renderer.camera.getWorldDirection(new THREE.Vector3(0, 0, 1));
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
            normal,
            this.sourceNode.position,
        );
        const intersect = this.raycaster.raycastPlane(plane);

        if (!intersect) return false;

        const positions = this.tempGeom.getAttribute('position') as THREE.BufferAttribute;
        positions.setXYZ(1, intersect.x, intersect.y, intersect.z);
        positions.needsUpdate = true;

        const hoverResult = this.raycaster.raycastNode();
        const targetNode = hoverResult?.node ?? null;

        this.sg.events.emit('connection:drag', {
            source: this.sourceNode,
            target: targetNode,
            position: intersect,
        });

        return true;
    }

    stop(finger: Finger): void {
        if (!this.isConnecting) return;

        const hoverResult = this.raycaster.raycastNode();
        const targetNode = hoverResult?.node ?? null;

        if (targetNode && this.sourceNode && targetNode !== this.sourceNode) {
            const edgeSpec: EdgeSpec = {
                id: `edge_${this.sourceNode.id}_${targetNode.id}_${Date.now()}`,
                source: this.sourceNode.id,
                target: targetNode.id,
                type: 'CurvedEdge',
                data: {},
            };
            this.sg.graph.addEdge(edgeSpec);
            targetNode.pulse(1.0);
            this.sg.events.emit('connection:complete', {
                source: this.sourceNode,
                target: targetNode,
            });
        } else {
            this.sg.events.emit('connection:cancelled', {});
        }

        if (this.tempLine) {
            this.sg.renderer.scene.remove(this.tempLine);
            this.tempGeom?.dispose();
            this.tempMaterial.dispose();
        }

        this.isConnecting = false;
        this.sourceNode = null;
        this.tempLine = null;
        this.tempGeom = null;
    }

    defer(_finger: Finger): boolean {
        return false;
    }
}
