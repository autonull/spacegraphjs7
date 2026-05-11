// SpaceGraphJS - Unified Surface Abstraction
// Common base for all nodes and edges, inspired by SGJ's Surface hierarchy

import * as THREE from 'three';
import { EventEmitter } from './EventEmitter';
import type { SpaceGraph } from '../SpaceGraph';
import type { Rect, Bounds3D } from '../types';

export type { Rect, Bounds3D };

export interface HitResult {
    surface: Surface;
    point: THREE.Vector3;
    localPoint: THREE.Vector3;
    distance: number;
    normal?: THREE.Vector3;
    uv?: THREE.Vector2;
    face?: THREE.Face;
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
    abstract get bounds3D(): Bounds3D;
    abstract hitTest(ray: THREE.Raycaster): HitResult | null;

    abstract get position(): THREE.Vector3;
    abstract get rotation(): THREE.Euler | THREE.Vector3;
    abstract get scale(): THREE.Vector3;
    abstract get worldMatrix(): THREE.Matrix4;

    abstract start(): void;
    abstract stop(): void;
    abstract delete(): void;

    parent?: Surface;
    children: Surface[] = [];
    visible = true;
    isTouchable = true;
    activity = 0;

    private readonly ACTIVITY_DECAY_RATE = 0.5;

    isDraggable(_localPos: THREE.Vector3): boolean {
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
        let current: Surface | undefined = this.parent;
        while (current) {
            if (predicate(current)) return current;
            current = current.parent;
        }
        return null;
    }

    ancestors(): Surface[] {
        const result: Surface[] = [];
        let current: Surface | undefined = this.parent;
        while (current) {
            result.push(current);
            current = current.parent;
        }
        return result;
    }

    descendants(): Surface[] {
        const result: Surface[] = [];
        for (const child of this.children) {
            result.push(child, ...child.descendants());
        }
        return result;
    }

    localToWorld(localPos: THREE.Vector3): THREE.Vector3 {
        return localPos.clone().applyMatrix4(this.worldMatrix);
    }

    worldToLocal(worldPos: THREE.Vector3): THREE.Vector3 {
        const inverse = this.worldMatrix.clone().invert();
        return worldPos.clone().applyMatrix4(inverse);
    }

    requireSpaceGraph(): SpaceGraph {
        if (!this.sg) {
            throw new Error(`Surface "${this.id}" requires SpaceGraph but sg is not initialized`);
        }
        return this.sg;
    }

    // Ergonomic helpers
    get isDisposed(): boolean {
        return !this.visible;
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
