import * as THREE from 'three';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { Edge } from './Edge';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeData, EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

export class CurvedEdge extends Edge {
    private curve: THREE.QuadraticBezierCurve3;
    private positionsBuffer: Float32Array;
    private _controlPoint = new THREE.Vector3();

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);

        this.curve = new THREE.QuadraticBezierCurve3(
            this.source.position,
            this.getControlPoint(),
            this.target.position,
        );

        const points = this.curve.getPoints(20);
        this.positionsBuffer = new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]));

        this.geometry = new LineGeometry();
        this.geometry.setPositions(Array.from(this.positionsBuffer));
        this.object.geometry.dispose();
        this.object.geometry = this.geometry;
    }

    private getControlPoint(): THREE.Vector3 {
        const curveStrength = ((this.data as EdgeData)?.curveStrength as number) ?? 50;
        const dir = this._controlPoint.subVectors(this.target.position, this.source.position);
        const normal = dir.clone().setZ(0).normalize();
        return new THREE.Vector3()
            .addVectors(this.source.position, this.target.position)
            .multiplyScalar(0.5)
            .add(normal.multiplyScalar(curveStrength));
    }

    update() {
        super.update();

        if (!this.curve) return;

        this.curve.v0.copy(this.source.position);
        this.curve.v1.copy(this.getControlPoint());
        this.curve.v2.copy(this.target.position);

        const points = this.curve.getPoints(20);
        let offset = 0;
        for (const p of points) {
            this.positionsBuffer[offset++] = p.x;
            this.positionsBuffer[offset++] = p.y;
            this.positionsBuffer[offset++] = p.z;
        }

        this.geometry.attributes.position.needsUpdate = true;
    }
}
