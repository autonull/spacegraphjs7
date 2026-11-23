import * as THREE from 'three';
import { EdgeColors } from '../core/constants';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import { MeshEdge } from './MeshEdge';

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
export class DynamicThicknessEdge extends MeshEdge {
    static readonly typeName: string = 'DynamicThicknessEdge';
    readonly mesh!: THREE.Mesh;
    readonly cylinder!: THREE.Mesh;

    constructor(sg: SpaceGraph | undefined, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);

        this.object.visible = false;

        const segments = Number(spec.data?.segments) || 6;
        const geometry = new THREE.CylinderGeometry(1, 1, 1, segments, 1);
        geometry.rotateX(Math.PI / 2);

        const material = new THREE.MeshBasicMaterial({
            color: (spec.data?.color as number) ?? EdgeColors.MESH_DEFAULT,
        });

        this.mesh = this.cylinder = new THREE.Mesh(geometry, material);
        this.mountMesh(this.mesh, 'edge-cylinder');
    }

    protected place(_direction: THREE.Vector3, target: THREE.Vector3, width: number, length: number): void {
        this.cylinder.lookAt(target);
        this.cylinder.scale.set(width, width, length);
    }
}
