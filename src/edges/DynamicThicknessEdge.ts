import * as THREE from 'three';
import { MathPool } from '../utils/MathPool';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

/**
 * DynamicThicknessEdge — A tube-based edge whose visual thickness reflects a
 * weight property.  Uses TubeGeometry (rebuilt on update) for true 3-D thickness
 * that scales correctly with zoom.
 *
 * data options:
 *   weight    : number 0–1 controlling thickness (default 0.5)
 *   minRadius : world-space tube radius at weight=0 (default 1)
 *   maxRadius : world-space tube radius at weight=1 (default 8)
 *   color     : hex color (default 0x3b82f6)
 *   segments  : tube radial segments (default 6)
 */
export class DynamicThicknessEdge {
    public id: string;
    public sg: SpaceGraph;
    public source: Node;
    public target: Node;
    public data: any;
    public object: THREE.Mesh;
    private geometry: THREE.CylinderGeometry;
    private material: THREE.MeshBasicMaterial;

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        this.sg = sg;
        this.id = spec.id;
        this.source = source;
        this.target = target;
        this.data = spec.data ?? {};

        this.material = new THREE.MeshBasicMaterial({
            color: spec.data?.color ?? 0x3b82f6,
        });

        this.geometry = this._buildGeometry();
        this.object = new THREE.Mesh(this.geometry, this.material);
        this.update(); // Set initial transform
    }

    private _buildGeometry(): THREE.CylinderGeometry {
        const segments = this.data.segments ?? 6;
        // Base cylinder of radius 1 and length 1, aligned along Y axis by default.
        // We rotate it to align along Z axis so lookAt works perfectly.
        const geom = new THREE.CylinderGeometry(1, 1, 1, segments, 1);
        geom.rotateX(Math.PI / 2);
        return geom;
    }

    updateSpec(updates: Partial<EdgeSpec>): void {
        if (updates.data) {
            this.data = { ...this.data, ...updates.data };
            if (updates.data.color) this.material.color.setHex(updates.data.color);
        }
    }

    update() {
        const pool = MathPool.getInstance();
        const src = this.source.position;
        const tgt = this.target.position;

        const { weight = 0.5, minRadius = 1, maxRadius = 8 } = this.data;
        const clampedWeight = Math.max(0, Math.min(1, weight));
        const radius = minRadius + clampedWeight * (maxRadius - minRadius);

        const dir = pool.acquireVector3().subVectors(tgt, src);
        const length = dir.length();

        const midPoint = pool.acquireVector3().addVectors(src, tgt).multiplyScalar(0.5);

        this.object.position.copy(midPoint);
        this.object.lookAt(tgt);
        this.object.scale.set(radius, radius, length);

        pool.releaseVector3(dir);
        pool.releaseVector3(midPoint);
    }

    dispose(): void {
        this.object.parent?.remove(this.object);
        this.geometry.dispose();
        this.material.dispose();
    }
}
