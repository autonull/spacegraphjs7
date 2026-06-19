import * as THREE from 'three';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { Edge } from './Edge';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeData, EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

export class CurvedEdge extends Edge {
    static readonly typeName = 'CurvedEdge';
    private curve: THREE.QuadraticBezierCurve3;
    private positionsBuffer: Float32Array;
    private _controlPoint = new THREE.Vector3();

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);

        const sourcePos = new THREE.Vector3();
        const targetPos = new THREE.Vector3();
        this.source.getWorldPosition(sourcePos);
        this.target.getWorldPosition(targetPos);

        this.curve = new THREE.QuadraticBezierCurve3(
            sourcePos.clone(),
            this.getControlPoint(sourcePos, targetPos),
            targetPos.clone(),
        );

        const points = this.curve.getPoints(20);
        this.positionsBuffer = new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]));

        this.geometry = new LineGeometry();
        this.geometry.setPositions(Array.from(this.positionsBuffer));
        this.object.geometry.dispose();
        this.object.geometry = this.geometry;
    }

    private getControlPoint(sourcePos: THREE.Vector3, targetPos: THREE.Vector3): THREE.Vector3 {
        const curveStrength = ((this.data as EdgeData)?.curveStrength as number) ?? 50;
        const dir = new THREE.Vector3().subVectors(targetPos, sourcePos);
        const normal = dir.clone().setZ(0).normalize();

        // Handle vertical lines or degenerate cases for normal
        if (normal.lengthSq() === 0) normal.set(1, 0, 0);

        const cp = new THREE.Vector3()
            .addVectors(sourcePos, targetPos)
            .multiplyScalar(0.5);

        // Offset normal to get curved effect
        const offset = new THREE.Vector3(-normal.y, normal.x, 0).multiplyScalar(curveStrength);
        return cp.add(offset);
    }

    update() {
        super.update();

        if (!this.curve) return;

        const sourcePos = new THREE.Vector3();
        const targetPos = new THREE.Vector3();
        this.source.getWorldPosition(sourcePos);
        this.target.getWorldPosition(targetPos);

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
}
