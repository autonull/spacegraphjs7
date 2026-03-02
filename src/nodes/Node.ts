import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class Node {
  public id: string;
  public sg: SpaceGraph;
  public data: any;
  public object: THREE.Object3D;
  public position: THREE.Vector3;

  constructor(sg: SpaceGraph, spec: NodeSpec) {
    this.sg = sg;
    this.id = spec.id;
    this.data = spec.data || {};
    this.position = new THREE.Vector3(
      spec.position?.[0] || 0,
      spec.position?.[1] || 0,
      spec.position?.[2] || 0
    );
    this.object = new THREE.Object3D();
  }

  updatePosition(x: number, y: number, z: number) {
    this.position.set(x, y, z);
    this.object.position.copy(this.position);
  }

  dispose(): void {
    if (this.object.parent) {
      this.object.parent.remove(this.object);
    }
  }
}
