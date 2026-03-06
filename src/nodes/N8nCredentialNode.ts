import * as THREE from 'three';
import { ShapeNode } from './ShapeNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';

export class N8nCredentialNode extends ShapeNode {
    private lockGroup?: THREE.Group;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);
        this.shape = 'circle';
        this.size = spec.size || 60;
        this.color = spec.color || '#e91e63'; // Pink for credentials
    }

    protected createMesh(): THREE.Object3D {
        const group = new THREE.Group();

        // Base Circle
        const baseMesh = super.createMesh();
        group.add(baseMesh);

        // Simple Lock Icon using primitives
        this.lockGroup = new THREE.Group();

        // Lock body (box)
        const bodyGeo = new THREE.BoxGeometry(this.size * 0.4, this.size * 0.3, this.size * 0.1);
        const lockMat = new THREE.MeshBasicMaterial({ color: '#f8bbd0' });
        const bodyMesh = new THREE.Mesh(bodyGeo, lockMat);
        bodyMesh.position.y = -this.size * 0.1;
        this.lockGroup.add(bodyMesh);

        // Lock shackle (torus half)
        const shackleGeo = new THREE.TorusGeometry(this.size * 0.15, this.size * 0.05, 8, 16, Math.PI);
        const shackleMesh = new THREE.Mesh(shackleGeo, lockMat);
        shackleMesh.position.y = this.size * 0.05;
        this.lockGroup.add(shackleMesh);

        // Move lock group to center slightly above base
        this.lockGroup.position.z = 2;

        group.add(this.lockGroup);

        return group;
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
    }
}
