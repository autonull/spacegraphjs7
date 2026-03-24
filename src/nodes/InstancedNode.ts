import * as THREE from 'three';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import type { GeometryFamily } from '../rendering/InstancedNodeRenderer';

export class InstancedNode extends Node {
    protected instanceSlot: number = -1;
    protected geometryFamily: GeometryFamily;
    protected colorHex: number;

    constructor(sg: SpaceGraph, spec: NodeSpec, family: GeometryFamily) {
        super(sg, spec);
        this.geometryFamily = family;
        this.colorHex = spec.data?.color ? new THREE.Color(spec.data.color).getHex() : 0x3366ff;
        this.registerWithInstancedRenderer();
        this.updateInstanceTransform();
    }

    private registerWithInstancedRenderer() {
        const instancedRenderer = this.sg.renderer.instancedRenderer;
        if (instancedRenderer) {
            this.instanceSlot = instancedRenderer.getNextAvailableSlot(this.geometryFamily);
            if (this.instanceSlot !== -1) {
                instancedRenderer.registerNode(this.id, this.geometryFamily, this.instanceSlot);
            }
        }
    }

    protected updateInstanceTransform() {
        if (this.instanceSlot === -1) return;
        const instancedRenderer = this.sg.renderer.instancedRenderer;
        if (instancedRenderer) {
            instancedRenderer.updateInstanceAt(
                this.geometryFamily,
                this.instanceSlot,
                this.position,
                this.object.quaternion,
                this.object.scale,
                this.colorHex,
            );
        }
    }

    updatePosition(x: number, y: number, z: number): this {
        super.updatePosition(x, y, z);
        this.updateInstanceTransform();
        return this;
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        if (updates.data?.color) {
            this.colorHex = new THREE.Color(updates.data.color).getHex();
            this.updateInstanceTransform();
        }
        return this;
    }

    dispose(): void {
        super.dispose();
        const instancedRenderer = this.sg.renderer.instancedRenderer;
        if (instancedRenderer && this.instanceSlot !== -1) {
            instancedRenderer.releaseSlot(this.geometryFamily, this.instanceSlot);
            this.instanceSlot = -1;
        }
    }
}
