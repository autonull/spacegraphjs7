import * as THREE from 'three';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeData, EdgeSpec } from '../types';
import { directionBetween, midpoint, perpendicularTo } from '../utils/vector';
import { Edge } from './Edge';

export class CurvedEdge extends Edge {
  static readonly typeName: string = 'CurvedEdge';
  readonly curve: THREE.QuadraticBezierCurve3;
  readonly positionsBuffer: Float32Array;

  constructor(sg: SpaceGraph | undefined, spec: EdgeSpec, source: Node, target: Node) {
    super(sg, spec, source, target);

    const { sourcePos, targetPos } = this.endpointPositions();

    this.curve = new THREE.QuadraticBezierCurve3(
      sourcePos.clone(),
      this.getControlPoint(sourcePos, targetPos),
      targetPos.clone()
    );

    const points = this.curve.getPoints(20);
    this.positionsBuffer = new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]));

    this.geometry = new LineGeometry();
    this.geometry.setPositions(Array.from(this.positionsBuffer));
    this.object.geometry.dispose();
    this.object.geometry = this.geometry;
  }

  update() {
    super.update();

    if (!this.curve) return;

    const { sourcePos, targetPos } = this.endpointPositions();

    this.curve.v0.copy(sourcePos);
    this.curve.v1.copy(this.getControlPoint(sourcePos, targetPos));
    this.curve.v2.copy(targetPos);

    const points = this.curve.getPoints(20);
    let offset = 0;
    for (const p of points) {
      this.positionsBuffer[offset++] = p.x;
      this.positionsBuffer[offset++] = p.y;
      this.positionsBuffer[offset++] = p.z;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  private getControlPoint(sourcePos: THREE.Vector3, targetPos: THREE.Vector3): THREE.Vector3 {
    const curveStrength = ((this.data as EdgeData)?.curveStrength as number) ?? 50;
    const normal = directionBetween(sourcePos, targetPos).setZ(0).normalize();

    // Handle vertical lines or degenerate cases for normal
    if (normal.lengthSq() === 0) normal.set(1, 0, 0);

    // Offset normal to get curved effect
    const offset = perpendicularTo(normal).multiplyScalar(curveStrength);
    return midpoint(sourcePos, targetPos).add(offset);
  }
}
