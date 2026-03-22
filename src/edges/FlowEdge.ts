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

        const dashSize = spec.data?.dashSize || 5;
        const gapSize = spec.data?.gapSize || 5;
        const color = spec.data?.color || 0x00ff00;
        const opacity = spec.data?.opacity !== undefined ? spec.data.opacity : 1.0;

        const material = new THREE.LineDashedMaterial({
            color: color,
            linewidth: spec.data?.lineWidth || 2,
            dashSize: dashSize,
            gapSize: gapSize,
            scale: 1,
            transparent: opacity < 1.0,
            opacity: opacity,
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

        if (!updates.data) return;

        const mat = this.object.material as THREE.LineDashedMaterial;

        if (updates.data.flowSpeed !== undefined) {
            this.baseSpeed = updates.data.flowSpeed;
            if (this.isFlowing) {
                this.flowSpeed = this.baseSpeed;
            }
        }

        if (updates.data.color !== undefined) {
            mat.color.setHex(updates.data.color);
        }

        if (updates.data.dashSize !== undefined) {
            mat.dashSize = updates.data.dashSize;
        }

        if (updates.data.gapSize !== undefined) {
            mat.gapSize = updates.data.gapSize;
        }

        if (updates.data.opacity !== undefined) {
            mat.opacity = updates.data.opacity;
            mat.transparent = updates.data.opacity < 1.0;
        }

        // Need to recompute if dashes changed
        if (updates.data.dashSize !== undefined || updates.data.gapSize !== undefined) {
             this.object.computeLineDistances();
             this.dashOffset = 0;
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

        this.dashOffset -= this.flowSpeed;

        this.object.computeLineDistances();

        const distances = this.geometry.attributes.lineDistance;
        if (distances) {
            for (let i = 0; i < distances.count; i++) {
                // Add the moving offset to the base computed line distances
                distances.setX(i, distances.getX(i) + this.dashOffset);
            }
            distances.needsUpdate = true;
        }
    }
}
