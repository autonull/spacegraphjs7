import * as THREE from 'three';

import { BaseInstancedNode } from './BaseInstancedNode';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';
import type { GeometryFamily } from '../rendering/InstancedNodeRenderer';

export class InstancedNode extends BaseInstancedNode {
    protected geometryFamily: GeometryFamily;
    private readonly _group: THREE.Group;

    override get object(): THREE.Object3D {
        return this._group;
    }

    constructor(sg: SpaceGraph, spec: NodeSpec, family: GeometryFamily) {
        super(sg, spec);
        this._group = new THREE.Group();
        this.geometryFamily = family;
        this.registerInstance();
        this.updateInstanceTransform();
    }

    protected registerInstance() {
        const instancedRenderer = this.sg!.renderer.instancedRenderer;
        if (instancedRenderer) {
            this.instanceSlot = instancedRenderer.getNextAvailableSlot(this.geometryFamily);
            if (this.instanceSlot !== -1) {
                instancedRenderer.registerNode(this.id, this.geometryFamily, this.instanceSlot);
            }
        }
    }

    protected updateInstanceTransform() {
        if (this.instanceSlot === -1) return;
        const instancedRenderer = this.sg!.renderer.instancedRenderer;
        if (instancedRenderer) {
            instancedRenderer.updateInstanceAt(
                this.geometryFamily,
                this.instanceSlot,
                this.position,
                this._group.quaternion,
                this._group.scale,
                this.colorHex,
            );
        }
    }

    dispose(): void {
        super.dispose();
        const instancedRenderer = this.sg!.renderer.instancedRenderer;
        if (instancedRenderer && this.instanceSlot !== -1) {
            instancedRenderer.releaseSlot(this.geometryFamily, this.instanceSlot);
            this.instanceSlot = -1;
        }
    }
}
