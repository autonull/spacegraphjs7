import * as THREE from 'three';
import { Edge } from './Edge';
import { ThreeDisposer } from '../utils/ThreeDisposer';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

export class BundledEdge extends Edge {
    private strands: THREE.Line[] = [];
    private strandCount: number;
    private spread: number;

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);

        this.strandCount = spec.data?.strandCount || 3;
        this.spread = spec.data?.spread || 5;

        // Hide the original super line, we will just use it as a container
        this.object.visible = false;

        // Create a new Group to hold strands so it can be added to scene
        const group = new THREE.Group();
        this.object.parent?.add(group);
        // Replace this.object with group to keep standard interface happy initially
        // Wait, super() set this.object to a Line. Let's just create our group and let the renderer manage `this.object`.
        // We can just add the strands as children of this.object (the hidden Line) 
        // but THREE.Line children are weird. Let's change this.object to be a Group.

        const oldObject = this.object;
        this.object = new THREE.Group() as any; // Type hack for Edge base

        // We need to swap the old object in the scene if it was added
        if (oldObject.parent) {
            oldObject.parent.add(this.object);
            oldObject.parent.remove(oldObject);
        }

        const material = new THREE.LineBasicMaterial({
            color: spec.data?.color || 0x888888,
            transparent: true,
            opacity: spec.data?.opacity || 0.6,
        });

        for (let i = 0; i < this.strandCount; i++) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(6);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const strand = new THREE.Line(geometry, material);
            this.strands.push(strand);
            this.object.add(strand);
        }

        ThreeDisposer.dispose(oldObject);
    }

    updateSpec(updates: Partial<EdgeSpec>) {
        super.updateSpec(updates);

        if (updates.data) {
            if (updates.data.spread) this.spread = updates.data.spread;
            if (updates.data.color || updates.data.opacity) {
                this.strands.forEach(strand => {
                    const mat = strand.material as THREE.LineBasicMaterial;
                    if (updates.data!.color) mat.color.setHex(updates.data!.color);
                    if (updates.data!.opacity) mat.opacity = updates.data!.opacity;
                });
            }
        }
    }

    update() {
        // Compute perpendicular vectors for the spread
        const dir = new THREE.Vector3().subVectors(this.target.position, this.source.position);

        // If they are exactly the same, no direction to compute spread
        if (dir.lengthSq() < 0.001) return;

        // Create an arbitrary orthogonal vector
        const ortho1 = new THREE.Vector3(-dir.y, dir.x, 0).normalize();

        // If dir is perfectly along Z, ortho1 will be zero
        if (ortho1.lengthSq() < 0.001) {
            ortho1.set(1, 0, 0);
        }

        const ortho2 = new THREE.Vector3().crossVectors(dir, ortho1).normalize();

        for (let i = 0; i < this.strandCount; i++) {
            // Distribute points in a cross-section circle
            const angle = (i / this.strandCount) * Math.PI * 2;

            // Perpendicular offset
            const offsetX = Math.cos(angle) * this.spread;
            const offsetY = Math.sin(angle) * this.spread;

            const offsetVec = new THREE.Vector3()
                .addScaledVector(ortho1, offsetX)
                .addScaledVector(ortho2, offsetY);

            const p1 = this.source.position.clone().add(offsetVec);
            const p2 = this.target.position.clone().add(offsetVec);

            const strand = this.strands[i];
            const posAttr = strand.geometry.attributes.position as THREE.BufferAttribute;

            posAttr.setXYZ(0, p1.x, p1.y, p1.z);
            posAttr.setXYZ(1, p2.x, p2.y, p2.z);
            posAttr.needsUpdate = true;
        }
    }

    dispose(): void {
        this.strands.forEach(strand => {
            this.object.remove(strand);
            ThreeDisposer.dispose(strand);
        });
        this.strands = [];
        super.dispose();
    }
}
