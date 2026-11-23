import * as THREE from 'three';
import { MathPool, withPooledVectors } from '../core/pooling/ObjectPool';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import { dataColor } from '../utils/color';
import { ribbonWidth } from '../utils/ribbon';
import { ThreeDisposer } from '../utils';
import { directionBetween, midpoint } from '../utils/vector';
import { Edge } from './Edge';

/**
 * TaperedEdge — a flat tapered polygon whose broad end sits at the source and narrows toward the
 * target. A single four-vertex trapezoid (two triangles) in the local XY plane, so it reads as
 * tangible weighted geometry instead of a tube. Geometry is built once in the constructor; update
 * only repositions, rotates and scales it from pooled vectors.
 *
 * data options:
 *   weight    : number 0-1 controlling width (default 0.5)
 *   minRadius : world-space width at weight=0 (default 1)
 *   maxRadius : world-space width at weight=1 (default 8)
 *   color     : hex color (default 0x3b82f6)
 *   segments  : accepted for ribbon-data compatibility; unused by the flat polygon
 */
export class TaperedEdge extends Edge {
    static readonly typeName: string = 'TaperedEdge';

    /** Narrow-end width as a fraction of the broad source end. */
    private static readonly TAPER_RATIO = 0.14;

    readonly mesh!: THREE.Mesh;
    readonly _initialized: boolean = false;

    constructor(sg: SpaceGraph | undefined, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);

        this.suppressLine = true;
        this.object.visible = false;

        const halfWidth = 0.5;
        const halfLength = 0.5;
        const narrow = halfWidth * TaperedEdge.TAPER_RATIO;
        // Broad source end at local y = -0.5, narrow target end at local y = +0.5.
        const positions = new Float32Array([
            -halfWidth,
            -halfLength,
            0,
            halfWidth,
            -halfLength,
            0,
            narrow,
            halfLength,
            0,
            -narrow,
            halfLength,
            0,
        ]);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setIndex([0, 1, 2, 0, 2, 3]);
        geometry.setAttribute(
            'color',
            new THREE.Float32BufferAttribute(
                [1, 1, 1, 1, 1, 1, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16],
                3,
            ),
        );

        const material = new THREE.MeshBasicMaterial({
            color: (spec.data?.color as number) ?? 0x3b82f6,
            side: THREE.DoubleSide,
            vertexColors: true,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.userData = { edgeId: this.id, type: 'edge-taper' };
        this.sg?.renderer.scene.add(this.mesh);
        this._initialized = true;
    }

    update(): void {
        if (!this._initialized) return;
        super.update();
        const pool = MathPool.getInstance();
        const { source, target, data } = this;
        const width = ribbonWidth(data);

        withPooledVectors(pool, 2, (dir, midPoint) => {
            const length = directionBetween(source.position, target.position, dir).length();
            midpoint(source.position, target.position, midPoint);
            this.mesh.position.copy(midPoint);
            // Align local +Y with the source→target direction so the broad end stays at the source.
            this.mesh.rotation.z = -Math.atan2(dir.x, dir.y);
            this.mesh.scale.set(width, length, 1);
        });
    }

    updateSpec(updates: Partial<EdgeSpec>): this {
        super.updateSpec(updates);
        const color = dataColor(updates.data?.color);
        if (color) (this.mesh.material as THREE.MeshBasicMaterial).color.set(color);
        return this;
    }

    dispose(): void {
        ThreeDisposer.disposeAndDetach(this.mesh);
        super.dispose();
    }
}
