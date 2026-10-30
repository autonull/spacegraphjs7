import { Group, Object3D } from 'three';
import type { GeometryFamily } from '../rendering/InstancedNodeRenderer';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { BaseInstancedNode } from './BaseInstancedNode';

export class InstancedNode extends BaseInstancedNode {
  static readonly typeName: string = 'InstancedNode';
  protected geometryFamily: GeometryFamily;
  readonly _group: Group;

  constructor(sg: SpaceGraph | undefined, spec: NodeSpec, family: GeometryFamily) {
    super(sg, spec);
    this._group = new Group();
    this.geometryFamily = family;
    this.registerInstance();
    this.updateInstanceTransform();
  }

  override get object(): Object3D {
    return this._group;
  }

  dispose(): void {
    super.dispose();
    const instancedRenderer = this.sg!.renderer.instancedRenderer;
    if (instancedRenderer && this.instanceSlot !== -1) {
      instancedRenderer.releaseSlot(this.geometryFamily, this.instanceSlot);
      this.instanceSlot = -1;
    }
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
        this.colorHex
      );
    }
  }
}
