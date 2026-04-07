import * as THREE from 'three';
import { Edge } from './Edge';
import { ThreeDisposer } from '../utils/ThreeDisposer';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeData, EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

export class AnimatedEdge extends Edge {
    private particle: THREE.Mesh;
    private progress = 0;
    private speed = 0.01;
    private reverse = false;

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);

        const data = spec.data as EdgeData & {
            speed?: number;
            reverse?: boolean;
            color?: number;
            particleSize?: number;
            particleColor?: number;
        };
        this.speed = data?.speed ?? 0.01;
        this.reverse = data?.reverse ?? false;

        if (this.object.material instanceof THREE.LineBasicMaterial) {
            this.object.material.color.setHex(data?.color ?? 0x444444);
            this.object.material.transparent = true;
            this.object.material.opacity = 0.4;
        }

        const particleGeom = new THREE.SphereGeometry(data?.particleSize ?? 3, 8, 8);
        const particleMat = new THREE.MeshBasicMaterial({
            color: data?.particleColor ?? 0x00ffcc,
        });

        this.particle = new THREE.Mesh(particleGeom, particleMat);
        this.object.add(this.particle);

        this.progress = this.reverse ? 1 : 0;
    }

    updateSpec(updates: Partial<EdgeSpec>): this {
        super.updateSpec(updates);

        if (updates.data) {
            const data = updates.data as EdgeData & {
                speed?: number;
                reverse?: boolean;
                particleColor?: number;
                particleSize?: number;
            };
            if (data.speed !== undefined) this.speed = data.speed;
            if (data.reverse !== undefined) this.reverse = data.reverse;

            if (data.particleColor) {
                (this.particle.material as THREE.MeshBasicMaterial).color.setHex(
                    data.particleColor,
                );
            }
            if (data.particleSize) {
                const s = data.particleSize / 3;
                this.particle.scale.set(s, s, s);
            }
        }
        return this;
    }

    update() {
        super.update();

        this.progress += this.reverse ? -this.speed : this.speed;

        if (this.progress > 1) this.progress = 0;
        if (this.progress < 0) this.progress = 1;

        this.particle.position.lerpVectors(
            this.source.position,
            this.target.position,
            this.progress,
        );
    }

    dispose(): void {
        this.object.remove(this.particle);
        ThreeDisposer.dispose(this.particle);
        super.dispose();
    }
}
