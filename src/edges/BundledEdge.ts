import * as THREE from 'three';
import { Edge } from './Edge';
import { ThreeDisposer } from '../utils/ThreeDisposer';
import { MathPool } from '../utils/MathPool';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeData, EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

export class BundledEdge extends Edge {
    private strands: THREE.Line[] = [];
    private strandCount: number;
    private spread: number;
    private _group: THREE.Group;

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);

        const data = spec.data as EdgeData & {
            strandCount?: number;
            spread?: number;
            color?: number;
            opacity?: number;
        };
        this.strandCount = data?.strandCount ?? 3;
        this.spread = data?.spread ?? 5;

        this.object.visible = false;

        this._group = new THREE.Group();

        const oldObject = this.object;
        if (oldObject.parent) {
            oldObject.parent.add(this._group);
            oldObject.parent.remove(oldObject);
        }

        const material = new THREE.LineBasicMaterial({
            color: data?.color ?? 0x888888,
            transparent: true,
            opacity: data?.opacity ?? 0.6,
        });

        for (let i = 0; i < this.strandCount; i++) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(6);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const strand = new THREE.Line(geometry, material);
            this.strands.push(strand);
            this._group.add(strand);
        }

        ThreeDisposer.dispose(oldObject);
    }

    updateSpec(updates: Partial<EdgeSpec>): this {
        super.updateSpec(updates);

        if (updates.data) {
            const data = updates.data as EdgeData & {
                spread?: number;
                color?: number;
                opacity?: number;
            };
            if (data.spread !== undefined) this.spread = data.spread;
            if (data.color !== undefined || data.opacity !== undefined) {
                for (const strand of this.strands) {
                    const mat = strand.material as THREE.LineBasicMaterial;
                    if (data.color) mat.color.setHex(data.color);
                    if (data.opacity !== undefined) mat.opacity = data.opacity;
                }
            }
        }
        return this;
    }

    update() {
        const pool = MathPool.getInstance();
        const dir = pool.acquireVector3().subVectors(this.target.position, this.source.position);

        if (dir.lengthSq() < 0.001) {
            pool.releaseVector3(dir);
            return;
        }

        const ortho1 = pool.acquireVector3().set(-dir.y, dir.x, 0).normalize();
        if (ortho1.lengthSq() < 0.001) ortho1.set(1, 0, 0);

        const ortho2 = pool.acquireVector3().crossVectors(dir, ortho1).normalize();

        const offsetVec = pool.acquireVector3();
        const p1 = pool.acquireVector3();
        const p2 = pool.acquireVector3();

        const { source, target, spread, strandCount } = this;

        for (let i = 0; i < strandCount; i++) {
            const angle = (i / strandCount) * Math.PI * 2;
            const offsetX = Math.cos(angle) * spread;
            const offsetY = Math.sin(angle) * spread;

            offsetVec.copy(ortho1).multiplyScalar(offsetX).addScaledVector(ortho2, offsetY);
            p1.copy(source.position).add(offsetVec);
            p2.copy(target.position).add(offsetVec);

            const posAttr = this.strands[i].geometry.attributes.position as THREE.BufferAttribute;
            posAttr.setXYZ(0, p1.x, p1.y, p1.z);
            posAttr.setXYZ(1, p2.x, p2.y, p2.z);
            posAttr.needsUpdate = true;
        }

        pool.releaseVector3(dir);
        pool.releaseVector3(ortho1);
        pool.releaseVector3(ortho2);
        pool.releaseVector3(offsetVec);
        pool.releaseVector3(p1);
        pool.releaseVector3(p2);
    }

    dispose(): void {
        for (const strand of this.strands) {
            this._group.remove(strand);
            ThreeDisposer.dispose(strand);
        }
        this.strands = [];
        super.dispose();
    }
}
