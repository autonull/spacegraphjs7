import * as THREE from 'three';
import { Edge } from './Edge';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

export class CurvedEdge extends Edge {
  private curve: THREE.QuadraticBezierCurve3;

  constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
    super(sg, spec, source, target);

    // Swap the default geometry with our curve geometry
    this.curve = new THREE.QuadraticBezierCurve3(
        this.source.position,
        this.getControlPoint(),
        this.target.position
    );

    const points = this.curve.getPoints(20);
    this.geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.object.geometry.dispose();
    this.object.geometry = this.geometry;
  }

  private getControlPoint(): THREE.Vector3 {
      const mid = new THREE.Vector3().addVectors(this.source.position, this.target.position).multiplyScalar(0.5);

      // Calculate a normal vector to push the curve outwards
      const dir = new THREE.Vector3().subVectors(this.target.position, this.source.position);
      const normal = new THREE.Vector3(-dir.y, dir.x, 0).normalize();

      // Determine curve strength based on edge data or default
      const curveStrength = this.data.curveStrength || 50;
      return mid.add(normal.multiplyScalar(curveStrength));
  }

  update() {
    this.curve.v0.copy(this.source.position);
    this.curve.v1.copy(this.getControlPoint());
    this.curve.v2.copy(this.target.position);

    const points = this.curve.getPoints(20);
    const positions = new Float32Array(points.length * 3);

    for (let i = 0; i < points.length; i++) {
        positions[i * 3] = points[i].x;
        positions[i * 3 + 1] = points[i].y;
        positions[i * 3 + 2] = points[i].z;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.attributes.position.needsUpdate = true;
  }
}
