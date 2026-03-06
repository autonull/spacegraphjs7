import * as THREE from 'three';
import { Edge } from './Edge';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

export class FlowEdge extends Edge {
    private dashOffset: number = 0;
    private flowSpeed: number = 1.0;
    private isFlowing: boolean = true;
    private baseSpeed: number = 1.0;

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);

        this.baseSpeed = spec.data?.flowSpeed || 2.0;
        this.flowSpeed = this.baseSpeed;

        const material = new THREE.LineDashedMaterial({
            color: spec.data?.color || 0x00ff00,
            linewidth: 2,
            dashSize: 5,
            gapSize: 5,
            scale: 1,
        });

        if (this.object.material) {
            if (Array.isArray(this.object.material)) {
                this.object.material.forEach((m) => m.dispose());
            } else {
                this.object.material.dispose();
            }
        }
        this.object.material = material;

        this.object.computeLineDistances();
    }

    updateSpec(updates: Partial<EdgeSpec>) {
        super.updateSpec(updates);

        if (updates.data && updates.data.flowSpeed !== undefined) {
            this.baseSpeed = updates.data.flowSpeed;
            if (this.isFlowing) {
                this.flowSpeed = this.baseSpeed;
            }
        }

        if (updates.data && updates.data.color) {
            (this.object.material as THREE.LineDashedMaterial).color.setHex(updates.data.color);
        }
    }

    startDataFlow(rate: number = 1): void {
        this.isFlowing = true;
        this.flowSpeed = this.baseSpeed * rate;
    }

    stopDataFlow(): void {
        this.isFlowing = false;
        this.flowSpeed = 0;
    }

    update() {
        super.update();

        if (!this.isFlowing) return;

        // Animate flow effect by updating dash properties or recreating distances
        // The dashOffset isn't a direct property of LineDashedMaterial,
        // but we can animate the dash by changing dashSize/gapSize or using a custom shader.
        // However, a simple trick for LineDashedMaterial is to shift the distances.

        this.dashOffset -= this.flowSpeed;

        // As LineDashedMaterial doesn't have dashOffset, we achieve flow by
        // manipulating the dashSize/gapSize or updating the line distances array directly.
        // A simpler approach for the built-in material without a custom shader is
        // just to increment dashOffset in our own logic and update dashSize/gapSize slightly
        // to simulate movement, or we can use a custom shader.

        // For a true flow effect with LineDashedMaterial, we often need to manipulate the distances.
        // Three.js computes line distances, we can add our offset to them.

        this.object.computeLineDistances();

        const distances = this.geometry.attributes.lineDistance;
        if (distances) {
            for (let i = 0; i < distances.count; i++) {
                distances.setX(i, distances.getX(i) + this.dashOffset);
            }
            distances.needsUpdate = true;
        }
    }
}
