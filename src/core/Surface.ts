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

export abstract class Surface extends EventEmitter<{
    pointerenter: { surface: Surface };
    pointerleave: { surface: Surface };
    pointerdown: { surface: Surface; event: PointerEvent };
    pointerup: { surface: Surface; event: PointerEvent };
}> {
    abstract bounds: Rect;
    abstract hitTest(ray: THREE.Raycaster): HitResult | null;
    abstract start(): void;
    abstract stop(): void;
    abstract delete(): void;

    parent?: Surface;
    children: Surface[] = [];
    visible = true;

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
