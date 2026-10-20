import * as THREE from 'three';

import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { Node } from './Node';

export abstract class BaseInstancedNode extends Node {
  protected instanceSlot = -1;
  protected colorHex: number;
  readonly _object: THREE.Object3D;

  protected constructor(sg: SpaceGraph | undefined, spec: NodeSpec, defaultColor = 0x3366ff) {
    super(sg, spec);
    this._object = new THREE.Object3D();
    this.colorHex = spec.data?.color
      ? new THREE.Color(spec.data.color as THREE.ColorRepresentation).getHex()
      : defaultColor;
  }

  get object(): THREE.Object3D {
    return this._object;
  }

  updatePosition(x: number, y: number, z: number): this {
    super.updatePosition(x, y, z);
    this.updateInstanceTransform();
    return this;
  }

  updateSpec(updates: Partial<NodeSpec>): this {
    super.updateSpec(updates);
    if (updates.data?.color) {
      this.colorHex = new THREE.Color(updates.data.color as THREE.ColorRepresentation).getHex();
      this.updateInstanceTransform();
    }
    return this;
  }

  protected abstract registerInstance(): void;

  protected abstract updateInstanceTransform(): void;
}
