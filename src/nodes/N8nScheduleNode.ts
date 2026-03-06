import * as THREE from 'three';
import { ShapeNode } from './ShapeNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';
import { gsap } from 'gsap';

export class N8nScheduleNode extends ShapeNode {
    private orbitDot?: THREE.Mesh;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);
        this.shape = 'circle';
        this.size = spec.size || 80;
        this.color = spec.color || '#ff9800'; // Orange for schedule
    }

    protected createMesh(): THREE.Object3D {
        const group = new THREE.Group();

        // Base Circle Mesh from parent
        const baseMesh = super.createMesh();
        group.add(baseMesh);

        // Orbit dot for countdown
        const dotGeo = new THREE.CircleGeometry(this.size * 0.1, 16);
        const dotMat = new THREE.MeshBasicMaterial({ color: '#ffe0b2' });
        this.orbitDot = new THREE.Mesh(dotGeo, dotMat);

        // Position on the edge
        this.orbitDot.position.set(0, this.size, 0);

        const orbitPivot = new THREE.Group();
        orbitPivot.add(this.orbitDot);

        group.add(orbitPivot);

        // Orbiting animation
        gsap.to(orbitPivot.rotation, {
            z: Math.PI * 2,
            duration: 5,
            repeat: -1,
            ease: "linear"
        });

        return group;
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);
    }
}
