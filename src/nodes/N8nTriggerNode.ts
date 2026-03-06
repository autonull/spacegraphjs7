import * as THREE from 'three';
import { ShapeNode } from './ShapeNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpecUpdate } from '../types';
import { gsap } from 'gsap';

export class N8nTriggerNode extends ShapeNode {
    private portalMesh?: THREE.Mesh;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);
        this.shape = 'hexagon';
        this.size = spec.size || 80;
        this.color = spec.color || '#4caf50'; // Green for trigger
    }

    protected createMesh(): THREE.Object3D {
        const group = new THREE.Group();

        // Base Hexagon Mesh from parent
        const baseMesh = super.createMesh();
        group.add(baseMesh);

        // Portal glow effect
        const portalGeo = new THREE.RingGeometry(this.size * 0.4, this.size * 0.45, 32);
        const portalMat = new THREE.MeshBasicMaterial({
            color: '#81c784',
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        this.portalMesh = new THREE.Mesh(portalGeo, portalMat);
        group.add(this.portalMesh);

        return group;
    }

    updateSpec(spec: SpecUpdate): void {
        super.updateSpec(spec);

        // GSAP Portal animation if running
        if (spec.parameters && spec.parameters.status === 'running' && this.portalMesh) {
             gsap.to(this.portalMesh.rotation, {
                z: this.portalMesh.rotation.z + Math.PI * 2,
                duration: 2,
                repeat: -1,
                ease: "linear"
             });
             gsap.to(this.portalMesh.material, {
                 opacity: 1,
                 duration: 0.5,
                 yoyo: true,
                 repeat: -1
             });
        } else if (this.portalMesh) {
             gsap.killTweensOf(this.portalMesh.rotation);
             gsap.killTweensOf(this.portalMesh.material);
             (this.portalMesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
        }
    }

    dispose(): void {
        super.dispose();
        if (this.portalMesh) {
             gsap.killTweensOf(this.portalMesh.rotation);
             gsap.killTweensOf(this.portalMesh.material);
        }
    }
}
