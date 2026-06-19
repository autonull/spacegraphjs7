import * as THREE from 'three';

import { Node } from './Node';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export abstract class BaseInstancedNode extends Node {
    protected instanceSlot: number = -1;
    protected colorHex: number;
    private readonly _object: THREE.Object3D;

    get object(): THREE.Object3D {
        return this._object;
    }

    constructor(sg: SpaceGraph, spec: NodeSpec, defaultColor = 0x3366ff) {
        super(sg, spec);
        this._object = new THREE.Object3D();
        this.colorHex = spec.data?.color
            ? new THREE.Color(spec.data.color as THREE.ColorRepresentation).getHex()
            : defaultColor;
    }

    protected abstract registerInstance(): void;
    protected abstract updateInstanceTransform(): void;

    updatePosition(x: number, y: number, z: number): this {
        super.updatePosition(x, y, z);
        this.updateInstanceTransform();
        return this;
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        if (updates.data?.color) {
            this.colorHex = new THREE.Color(
                updates.data.color as THREE.ColorRepresentation,
            ).getHex();
            this.updateInstanceTransform();
        }
        return this;
    }
}
