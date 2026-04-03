import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { Edge } from './Edge';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeData, EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

export class FlowEdge extends Edge {
    private dashOffset = 0;
    private flowSpeed = 1.0;
    private isFlowing = true;
    private baseSpeed = 1.0;

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);

        const data = spec.data as EdgeData & {
            flowSpeed?: number;
            dashSize?: number;
            gapSize?: number;
            color?: number;
            lineWidth?: number;
            opacity?: number;
        };
        this.baseSpeed = data?.flowSpeed ?? 2.0;
        this.flowSpeed = this.baseSpeed;

        const dashSize = data?.dashSize ?? 5;
        const gapSize = data?.gapSize ?? 5;
        const color = data?.color ?? 0x00ff00;
        const opacity = data?.opacity ?? 1.0;

        const material = new LineMaterial({
            color,
            linewidth: data?.lineWidth ?? 2,
            dashSize,
            gapSize,
            dashed: true,
            transparent: opacity < 1.0,
            opacity,
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
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

    updateSpec(updates: Partial<EdgeSpec>): this {
        super.updateSpec(updates);

        if (!updates.data) return this;

        const data = updates.data as EdgeData & {
            flowSpeed?: number;
            dashSize?: number;
            gapSize?: number;
            color?: number;
            opacity?: number;
        };
        const mat = this.object.material as LineMaterial;

        if (data.flowSpeed !== undefined) {
            this.baseSpeed = data.flowSpeed;
            if (this.isFlowing) {
                this.flowSpeed = this.baseSpeed;
            }
        }

        if (data.color !== undefined) mat.color.setHex(data.color);
        if (data.dashSize !== undefined) mat.dashSize = data.dashSize;
        if (data.gapSize !== undefined) mat.gapSize = data.gapSize;

        if (data.opacity !== undefined) {
            mat.opacity = data.opacity;
            mat.transparent = data.opacity < 1.0;
        }

        if (data.dashSize !== undefined || data.gapSize !== undefined) {
            this.object.computeLineDistances();
            this.dashOffset = 0;
        }
        return this;
    }

    startDataFlow(rate = 1): void {
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
                distances.setX(i, distances.getX(i) + this.dashOffset);
            }
            distances.needsUpdate = true;
        }
    }
}
