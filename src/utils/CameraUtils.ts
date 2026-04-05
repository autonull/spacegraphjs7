import * as THREE from 'three';
import { DEG2RAD } from './math';

export interface Point {
    x: number;
    y: number;
}

export interface FitViewResult {
    center: THREE.Vector3;
    cameraZ: number;
}

export function calculateFitView(
    nodes: Array<{ position: THREE.Vector3 }>,
    camera: THREE.PerspectiveCamera,
    padding: number = 100,
    minDistance: number = 200,
): FitViewResult | null {
    if (!nodes || nodes.length === 0) return null;

    const box = new THREE.Box3();
    for (const node of nodes) {
        if (node?.position) {
            box.expandByPoint(node.position);
        }
    }

    const center = new THREE.Vector3();
    box.getCenter(center);

    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fovRad = camera.fov * DEG2RAD;
    const aspect = camera.aspect;
    const cameraZ = Math.abs(maxDim / (2 * Math.tan(fovRad / 2) * Math.max(1, aspect)));

    return { center, cameraZ: Math.max(cameraZ + padding, minDistance) };
}

/** @deprecated Use `calculateFitView` directly */
export const CameraUtils = { calculateFitView };
