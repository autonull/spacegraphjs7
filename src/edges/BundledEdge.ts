import { MathPool, withPooledVectors } from '../core';
import { ThreeDisposer } from '../utils';
import * as THREE from 'three';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeData, EdgeSpec } from '../types';
import { dataColor } from '../utils/color';
import { directionBetween, perpendicularTo } from '../utils/vector';
import { EdgeColors } from '../core/constants';
import { Edge } from './Edge';

export class BundledEdge extends Edge {
    static readonly typeName: string = 'BundledEdge';
    private strands: THREE.Line[] = [];
    readonly strandCount: number;
    private spread: number;
    readonly _group: THREE.Group;

    constructor(sg: SpaceGraph | undefined, spec: EdgeSpec, source: Node, target: Node) {
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
            color: data?.color ?? EdgeColors.MUTED,
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
            const color = dataColor(data.color);
            if (color !== undefined || data.opacity !== undefined) {
                for (const strand of this.strands) {
                    const mat = strand.material as THREE.LineBasicMaterial;
                    if (color) mat.color.set(color);
                    if (data.opacity !== undefined) mat.opacity = data.opacity;
                }
            }
        }
        return this;
    }

    update() {
        const pool = MathPool.getInstance();
        withPooledVectors(pool, 6, (dir, ortho1, ortho2, offsetVec, p1, p2) => {
            directionBetween(this.source.position, this.target.position, dir);
            if (dir.lengthSq() < 0.001) return;

            perpendicularTo(dir, ortho1).normalize();
            ortho2.crossVectors(dir, ortho1).normalize();

            const { source, target, spread, strandCount } = this;
            for (let i = 0; i < strandCount; i++) {
                const angle = (i / strandCount) * Math.PI * 2;
                offsetVec
                    .copy(ortho1)
                    .multiplyScalar(Math.cos(angle) * spread)
                    .addScaledVector(ortho2, Math.sin(angle) * spread);
                p1.copy(source.position).add(offsetVec);
                p2.copy(target.position).add(offsetVec);

                const posAttr = this.strands[i].geometry.attributes
                    .position as THREE.BufferAttribute;
                posAttr.setXYZ(0, p1.x, p1.y, p1.z);
                posAttr.setXYZ(1, p2.x, p2.y, p2.z);
                posAttr.needsUpdate = true;
            }
        });
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
