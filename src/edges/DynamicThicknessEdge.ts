import * as THREE from 'three';
import { clamp } from '../../utils/math';
import { Edge } from './Edge';
import { MathPool } from '../core/pooling/ObjectPool';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeData, EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

/**
 * DynamicThicknessEdge — A tube-based edge whose visual thickness reflects a
 * weight property. Uses a scaled CylinderGeometry for true 3D thickness
 * that scales correctly with zoom.
 *
 * data options:
 *   weight    : number 0-1 controlling thickness (default 0.5)
 *   minRadius : world-space tube radius at weight=0 (default 1)
 *   maxRadius : world-space tube radius at weight=1 (default 8)
 *   color     : hex color (default 0x3b82f6)
 *   segments  : tube radial segments (default 6)
 */
export class DynamicThicknessEdge extends Edge {
    private cylinder: THREE.Mesh;

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);

        this.object.visible = false;

        const segments = Number(spec.data?.segments) || 6;
        const geometry = new THREE.CylinderGeometry(1, 1, 1, segments, 1);
        geometry.rotateX(Math.PI / 2);

        const material = new THREE.MeshBasicMaterial({
            color: (spec.data?.color as number) ?? 0x3b82f6,
        });

        this.cylinder = new THREE.Mesh(geometry, material);
        this.cylinder.userData = { edgeId: this.id, type: 'edge-cylinder' };
        this.sg?.renderer.scene.add(this.cylinder);
    }

    update(): void {
        const pool = MathPool.getInstance();
        const { source, target, data } = this;
        const { weight = 0.5, minRadius = 1, maxRadius = 8 } = data;
        const clampedWeight = clamp(weight as number, 0, 1);
        const radius =
            (minRadius as number) + clampedWeight * ((maxRadius as number) - (minRadius as number));

        const dir = pool.acquireVector3().subVectors(target.position, source.position);
        const length = dir.length();

        const midPoint = pool
            .acquireVector3()
            .addVectors(source.position, target.position)
            .multiplyScalar(0.5);

        this.cylinder.position.copy(midPoint);
        this.cylinder.lookAt(target.position);
        this.cylinder.scale.set(radius, radius, length);

        pool.releaseVector3(dir);
        pool.releaseVector3(midPoint);
    }

    updateSpec(updates: Partial<EdgeSpec>): this {
        super.updateSpec(updates);
        if (updates.data?.color) {
            (this.cylinder.material as THREE.MeshBasicMaterial).color.setHex(updates.data.color);
        }
        return this;
    }

    dispose(): void {
        this.cylinder.parent?.remove(this.cylinder);
        this.cylinder.geometry?.dispose();
        (this.cylinder.material as THREE.Material)?.dispose();
        super.dispose();
    }
}
