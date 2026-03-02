import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

export class Edge {
  public id: string;
  public sg: SpaceGraph;
  public source: Node;
  public target: Node;
  public data: any;
  public object: THREE.Line;
  public geometry: THREE.BufferGeometry;

  constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
    this.sg = sg;
    this.id = spec.id;
    this.source = source;
    this.target = target;
    this.data = spec.data || {};

    const points = [this.source.position, this.target.position];
    this.geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x666666, linewidth: 2 });

    this.object = new THREE.Line(this.geometry, material);
  }

  updateSpec(updates: Partial<EdgeSpec>) {
    if (updates.data) {
      this.data = { ...this.data, ...updates.data };
      if (updates.data.color) {
        (this.object.material as THREE.LineBasicMaterial).color.setHex(updates.data.color);
      }
    }
  }

  update() {
    const positions = new Float32Array([
      this.source.position.x, this.source.position.y, this.source.position.z,
      this.target.position.x, this.target.position.y, this.target.position.z
    ]);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose(): void {
    if (this.object.parent) {
      this.object.parent.remove(this.object);
    }
    this.geometry.dispose();
    if (this.object.material) {
      (this.object.material as THREE.Material).dispose();
    }
  }
}
