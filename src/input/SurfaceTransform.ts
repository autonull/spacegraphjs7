// SpaceGraphJS - SurfaceTransform
// Coordinate space transforms for nested dragging, inspired by SGJ's Finger.push(SurfaceTransform, fn)

import * as THREE from 'three';

export interface SurfaceTransform {
    worldToLocal(world: THREE.Vector3): THREE.Vector3;
    localToWorld(local: THREE.Vector3): THREE.Vector3;
}

export function createParentTransform(parent: THREE.Object3D | null): SurfaceTransform {
    if (parent) {
        return {
            worldToLocal: (w: THREE.Vector3) => parent.worldToLocal(w.clone()),
            localToWorld: (l: THREE.Vector3) => parent.localToWorld(l.clone()),
        };
    }
    return {
        worldToLocal: (w: THREE.Vector3) => w.clone(),
        localToWorld: (l: THREE.Vector3) => l.clone(),
    };
}
