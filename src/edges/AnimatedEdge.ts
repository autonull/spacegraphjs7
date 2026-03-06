import * as THREE from 'three';
import { Edge } from './Edge';
import { ThreeDisposer } from '../utils/ThreeDisposer';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

export class AnimatedEdge extends Edge {
    private particle: THREE.Mesh;
    private progress: number = 0;
    private speed: number = 0.01;
    private reverse: boolean = false;

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);

        this.speed = spec.data?.speed || 0.01;
        this.reverse = spec.data?.reverse || false;

        // Base line is already created in super(), we just style it
        if (this.object.material instanceof THREE.LineBasicMaterial) {
            this.object.material.color.setHex(spec.data?.color || 0x444444);
            this.object.material.transparent = true;
            this.object.material.opacity = 0.4;
        }

        // Create the traveling particle
        const particleGeom = new THREE.SphereGeometry(spec.data?.particleSize || 3, 8, 8);
        const particleMat = new THREE.MeshBasicMaterial({
            color: spec.data?.particleColor || 0x00ffcc
        });

        this.particle = new THREE.Mesh(particleGeom, particleMat);
        this.object.add(this.particle); // Attach particle to the line group
    }

    updateSpec(updates: Partial<EdgeSpec>) {
        super.updateSpec(updates);

        if (updates.data) {
            if (updates.data.speed !== undefined) this.speed = updates.data.speed;
            if (updates.data.reverse !== undefined) this.reverse = updates.data.reverse;

            if (updates.data.particleColor) {
                (this.particle.material as THREE.MeshBasicMaterial).color.setHex(updates.data.particleColor);
            }
            if (updates.data.particleSize) {
                // To change size we need to scale or recreate geom. Scaling is easier.
                const s = updates.data.particleSize / 3; // 3 was the base
                this.particle.scale.set(s, s, s);
            }
        }
    }

    update() {
        super.update();

        // Animate the particle along the line
        this.progress += this.reverse ? -this.speed : this.speed;

        if (this.progress > 1) this.progress = 0;
        if (this.progress < 0) this.progress = 1;

        // Linear interpolation between source and target
        this.particle.position.lerpVectors(this.source.position, this.target.position, this.progress);

        // Since particle is added to this.object (which is positioned at origin and contains world-coords geometry)
        // this lerped world position works perfectly.
    }

    dispose(): void {
        this.object.remove(this.particle);
        ThreeDisposer.dispose(this.particle);
        super.dispose();
    }
}
