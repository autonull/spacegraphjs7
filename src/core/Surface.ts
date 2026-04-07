// SpaceGraphJS - Unified Surface Abstraction
// Common base for all nodes and edges, inspired by SGJ's Surface hierarchy

import * as THREE from 'three';
import { EventEmitter } from './EventEmitter';

export interface HitResult {
    surface: Surface;
    point: THREE.Vector3;
    localPoint: THREE.Vector3;
    distance: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type SurfaceEventMap = {
    pointerenter: { surface: Surface };
    pointerleave: { surface: Surface };
    pointerdown: { surface: Surface; event: PointerEvent };
    pointerup: { surface: Surface; event: PointerEvent };
    updated: { surface: Surface; changes: unknown };
    destroying: { surface: Surface };
    [key: string]: unknown;
};

export abstract class Surface extends EventEmitter<SurfaceEventMap> {
    abstract readonly id: string;
    abstract readonly type: string;
    abstract bounds: Rect;
    abstract hitTest(ray: THREE.Raycaster): HitResult | null;
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

    pulse(intensity: number = 1.0): void {
        this.activity = Math.max(this.activity, intensity);
        if ('lastActivityTime' in this) {
            (this as any).lastActivityTime = performance.now();
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
}
