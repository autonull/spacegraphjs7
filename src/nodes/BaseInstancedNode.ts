import * as THREE from 'three';

import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { Object3DNode } from './Object3DNode';

export abstract class BaseInstancedNode extends Object3DNode {
  protected instanceSlot = -1;
  protected colorHex: number;

  protected constructor(sg: SpaceGraph | undefined, spec: NodeSpec, defaultColor = 0x3366ff) {
    super(sg, spec);
    this.colorHex = spec.data?.color
      ? new THREE.Color(spec.data.color as THREE.ColorRepresentation).getHex()
      : defaultColor;
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
