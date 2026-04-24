import * as THREE from 'three';
import type { Node } from '../../nodes/Node';
import type { Finger } from '../Fingering';
import { BaseFingering } from './BaseFingering';

export class WiringFingering extends BaseFingering {
    private isConnecting = false;
    private sourceNode: Node | null = null;
    private tempLine: THREE.Line | null = null;
    private tempGeom: THREE.BufferGeometry | null = null;
    private readonly tempMaterial = new THREE.LineBasicMaterial({ color: 0x8b5cf6, linewidth: 2 });

    start(finger: Finger): boolean {
        if (finger.buttons !== 1) return false;

        const result = this.raycaster.raycastNode();
        if (!result?.node) return false;

        const node = result.node;
        if (!node) return false;

        this.sourceNode = node;
        this.isConnecting = true;
        this.active = true;

        const positions = new Float32Array(6);
        positions[0] = node.position.x;
        positions[1] = node.position.y;
        positions[2] = node.position.z;
        positions[3] = node.position.x;
        positions[4] = node.position.y;
        positions[5] = node.position.z;

        this.tempGeom = new THREE.BufferGeometry();
        this.tempGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.tempLine = new THREE.Line(this.tempGeom, this.tempMaterial);
        this.sg.scene.add(this.tempLine);

        return true;
    }

    update(finger: Finger): boolean {
        if (!this.isConnecting || !this.tempGeom) return false;

        const ndc = finger.ndc;
        const vector = new THREE.Vector3(ndc.x, ndc.y, 0.5);
        vector.unproject(this.sg.renderer.camera);

        const pos = this.tempGeom.attributes.position as THREE.BufferAttribute;
        pos.setXYZ(1, vector.x, vector.y, vector.z);
        pos.needsUpdate = true;

        return true;
    }

    stop(_finger: Finger): void {
        if (this.sourceNode && this.tempLine) {
            this.sg.scene.remove(this.tempLine);
            this.tempGeom?.dispose();
            this.tempLine = null;
            this.tempGeom = null;
        }

        this.isConnecting = false;
        this.active = false;
        this.sourceNode = null;
    }

    defer(_finger: Finger): boolean {
        return !this.isConnecting;
    }
}