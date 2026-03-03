import * as THREE from 'three';
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
    private geometry: THREE.TubeGeometry;
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
    }

    private _buildGeometry(): THREE.TubeGeometry {
        const weight = Math.max(0, Math.min(1, this.data.weight ?? 0.5));
        const minR = this.data.minRadius ?? 1;
        const maxR = this.data.maxRadius ?? 8;
        const radius = minR + weight * (maxR - minR);
        const segments = this.data.segments ?? 6;

        const curve = new THREE.LineCurve3(
            this.source.position.clone(),
            this.target.position.clone(),
        );
        return new THREE.TubeGeometry(curve, 1, radius, segments, false);
    }

    updateSpec(updates: Partial<EdgeSpec>): void {
        if (updates.data) {
            this.data = { ...this.data, ...updates.data };
            if (updates.data.color) this.material.color.setHex(updates.data.color);
        }
    }

    update() {
        this.geometry.dispose();
        this.geometry = this._buildGeometry();
        this.object.geometry = this.geometry;
    }

    dispose(): void {
        this.object.parent?.remove(this.object);
        this.geometry.dispose();
        this.material.dispose();
    }
}
