import { MathPool } from '../core';
import * as THREE from 'three';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import { dataColor } from '../utils/color';
import { clamp } from '../utils/math';
import { directionBetween, midpoint } from '../utils/vector';
import { Edge } from './Edge';

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
  static readonly typeName: string = 'DynamicThicknessEdge';
  readonly cylinder!: THREE.Mesh;
  readonly _initialized: boolean = false;

  constructor(sg: SpaceGraph | undefined, spec: EdgeSpec, source: Node, target: Node) {
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
    this._initialized = true;
  }

  update(): void {
    if (!this._initialized) return;
    super.update();
    const pool = MathPool.getInstance();
    const { source, target, data } = this;
    const { weight = 0.5, minRadius = 1, maxRadius = 8 } = data;
    const clampedWeight = clamp(weight as number, 0, 1);
    const radius =
      (minRadius as number) + clampedWeight * ((maxRadius as number) - (minRadius as number));

    const dir = directionBetween(source.position, target.position, pool.acquireVector3());
    const length = dir.length();

    const midPoint = midpoint(source.position, target.position, pool.acquireVector3());

    this.cylinder.position.copy(midPoint);
    this.cylinder.lookAt(target.position);
    this.cylinder.scale.set(radius, radius, length);

    pool.releaseVector3(dir);
    pool.releaseVector3(midPoint);
  }

  updateSpec(updates: Partial<EdgeSpec>): this {
    super.updateSpec(updates);
    const color = dataColor(updates.data?.color);
    if (color) (this.cylinder.material as THREE.MeshBasicMaterial).color.set(color);
    return this;
  }

  dispose(): void {
    this.cylinder.parent?.remove(this.cylinder);
    this.cylinder.geometry?.dispose();
    (this.cylinder.material as THREE.Material)?.dispose();
    super.dispose();
  }
}
