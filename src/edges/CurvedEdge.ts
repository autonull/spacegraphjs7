import * as THREE from 'three';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { Edge } from './Edge';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeData, EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

export class CurvedEdge extends Edge {
    private curve: THREE.QuadraticBezierCurve3;
    private positionsBuffer: Float32Array;

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);

        this.curve = new THREE.QuadraticBezierCurve3(
            this.source.position,
            this.getControlPoint(),
            this.target.position,
        );

        const points = this.curve.getPoints(20);
        this.positionsBuffer = new Float32Array(points.length * 3);
        for (let i = 0; i < points.length; i++) {
            this.positionsBuffer[i * 3] = points[i].x;
            this.positionsBuffer[i * 3 + 1] = points[i].y;
            this.positionsBuffer[i * 3 + 2] = points[i].z;
        }

        this.geometry = new LineGeometry();
        this.geometry.setPositions(Array.from(this.positionsBuffer));
        this.object.geometry.dispose();
        this.object.geometry = this.geometry;
    }

    private getControlPoint(): THREE.Vector3 {
        const mid = new THREE.Vector3()
            .addVectors(this.source.position, this.target.position)
            .multiplyScalar(0.5);

        const dir = new THREE.Vector3().subVectors(this.target.position, this.source.position);
        const normal = new THREE.Vector3(-dir.y, dir.x, 0).normalize();

        const curveStrength = Number((this.data as EdgeData).curveStrength as number) || 50;
        return mid.add(normal.multiplyScalar(curveStrength));
    }

    update() {
        this.curve.v0.copy(this.source.position);
        this.curve.v1.copy(this.getControlPoint());
        this.curve.v2.copy(this.target.position);

        const points = this.curve.getPoints(20);

        for (let i = 0; i < points.length; i++) {
            this.positionsBuffer[i * 3] = points[i].x;
            this.positionsBuffer[i * 3 + 1] = points[i].y;
            this.positionsBuffer[i * 3 + 2] = points[i].z;
        }

        this.geometry.attributes.position.needsUpdate = true;
    }
}
