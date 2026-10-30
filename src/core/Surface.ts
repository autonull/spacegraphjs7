// SpaceGraphJS - Unified Surface Abstraction
// Common base for all nodes and edges, inspired by SGJ's Surface hierarchy

import { Box3, Euler, Face, Matrix4, Raycaster, Vector2, Vector3 } from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { Bounds3D, Rect } from '../types';
import { EventEmitter } from './EventEmitter';

export type { Bounds3D, Rect };

/**
 * The rectangle a box covers on screen.
 */
export function rectOf(box: Box3): Rect {
  return {
    x: box.min.x,
    y: box.min.y,
    width: box.max.x - box.min.x,
    height: box.max.y - box.min.y,
  };
}

/**
 * The volume between two corners, with the optional tests a concrete surface answers with.
 */
export function createBounds3D(
  min: Vector3,
  max: Vector3,
  test?: {
    containsPoint(point: Vector3): boolean;
    intersectsRay(ray: Raycaster): boolean;
  }
): Bounds3D {
  return {
    min,
    max,
    get center() {
      return new Vector3().addVectors(this.min, this.max).multiplyScalar(0.5);
    },
    get size() {
      return new Vector3().subVectors(this.max, this.min);
    },
    containsPoint: test?.containsPoint ?? (() => false),
    intersectsRay: test?.intersectsRay ?? (() => false),
  };
}

export interface HitResult {
  surface: Surface;
  point: Vector3;
  localPoint: Vector3;
  distance: number;
  normal?: Vector3;
  uv?: Vector2;
  face?: Face;
}

export type SurfaceEventMap = {
  pointerenter: { surface: Surface };
  pointerleave: { surface: Surface };
  pointerdown: { surface: Surface; event: PointerEvent };
  pointerup: { surface: Surface; event: PointerEvent };
  updated: { surface: Surface; changes: unknown };
  'surface:destroying': { surface: Surface; timestamp: number };
  [key: string]: unknown;
};

export abstract class Surface extends EventEmitter<SurfaceEventMap> {
  abstract readonly id: string;
  abstract readonly type: string;
  abstract sg?: SpaceGraph;
  abstract bounds: Rect;
  parent?: Surface;
  children: Surface[] = [];
  visible = true;
  isTouchable = true;
  activity = 0;
  readonly ACTIVITY_DECAY_RATE = 0.5;

  abstract get bounds3D(): Bounds3D;

  abstract get position(): Vector3;

  abstract get rotation(): Euler | Vector3;

  abstract get scale(): Vector3;

  abstract get worldMatrix(): Matrix4;

  // Ergonomic helpers
  get isDisposed(): boolean {
    return !this.visible;
  }

  abstract hitTest(ray: Raycaster): HitResult | null;

  abstract start(): void;

  abstract stop(): void;

  abstract delete(): void;

  isDraggable(_localPos: Vector3): boolean {
    return true;
  }

  onPreRender(_dt: number): void {
    this.activity *= Math.exp(-_dt / this.ACTIVITY_DECAY_RATE);
  }

  pulse(intensity = 1.0): void {
    this.activity = Math.max(this.activity, intensity);
    if ('lastActivityTime' in this) {
      (this as unknown as { lastActivityTime: number }).lastActivityTime = performance.now();
    }
  }

  parentOrSelf(): Surface {
    return this.parent ?? this;
  }

  findParent(predicate: (s: Surface) => boolean): Surface | null {
    return this.ancestors().find(predicate) ?? null;
  }

  findAncestor(predicate: (s: Surface) => boolean): Surface | null {
    if (predicate(this)) return this;
    return this.findParent(predicate);
  }

  ancestors(): Surface[] {
    const result: Surface[] = [];
    for (let current = this.parent; current; current = current.parent) result.push(current);
    return result;
  }

  descendants(): Surface[] {
    const result: Surface[] = [];
    for (const child of this.children) {
      result.push(child, ...child.descendants());
    }
    return result;
  }

  localToWorld(localPos: Vector3): Vector3 {
    return localPos.clone().applyMatrix4(this.worldMatrix);
  }

  worldToLocal(worldPos: Vector3): Vector3 {
    const inverse = this.worldMatrix.clone().invert();
    return worldPos.clone().applyMatrix4(inverse);
  }

  requireSpaceGraph(): SpaceGraph {
    if (!this.sg) {
      throw new Error(
        `${this.surfaceKind} "${this.id}" requires SpaceGraph but sg is not initialized`
      );
    }
    return this.sg;
  }

  /** The label this surface names itself with when it reports a missing SpaceGraph. */
  protected get surfaceKind(): string {
    return 'Surface';
  }

  hasAncestor(predicate: (s: Surface) => boolean): boolean {
    return !!this.findAncestor(predicate);
  }

  distanceTo(other: Surface): number {
    return this.position.distanceTo(other.position);
  }

  angleTo(other: Surface): number {
    return this.position.angleTo(other.position);
  }
}
