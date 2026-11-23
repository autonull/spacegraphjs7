import * as THREE from 'three';
import { Defaults, EdgeColors } from '../core/constants';
import type { EdgeData } from '../types';

export type ArrowheadPair = { source: THREE.Mesh | null; target: THREE.Mesh | null };

const ARROWHEAD_AXIS = new THREE.Vector3(0, 1, 0);
const direction = new THREE.Vector3();

export function createArrowheads(
    data: EdgeData,
    edgeId: string,
    renderOrder: number,
    opacity: number,
): ArrowheadPair {
    const create = (): THREE.Mesh => {
        const size = data.arrowheadSize ?? Defaults.ARROWHEAD_SIZE;
        const material = new THREE.MeshBasicMaterial({
            color: data.arrowheadColor ?? data.color ?? EdgeColors.DEFAULT,
            opacity,
            transparent: true,
            depthTest: false,
        });
        const mesh = new THREE.Mesh(new THREE.ConeGeometry(size / 2, size, 8), material);
        mesh.renderOrder = renderOrder + 1;
        mesh.userData = { edgeId, type: 'edge-arrowhead' };
        return mesh;
    };

    const { arrowhead } = data;
    return {
        target:
            arrowhead === true || arrowhead === 'target' || arrowhead === 'both' ? create() : null,
        source: arrowhead === 'source' || arrowhead === 'both' ? create() : null,
    };
}

export function styleArrowheads(pair: ArrowheadPair, opacity: number, color?: number): void {
    for (const mesh of [pair.source, pair.target]) {
        if (!(mesh?.material instanceof THREE.MeshBasicMaterial)) continue;
        if (color !== undefined) mesh.material.color.setHex(color);
        mesh.material.opacity = opacity;
    }
}

export function updateArrowheads(
    pair: ArrowheadPair,
    scene: THREE.Scene | undefined,
    sourcePos: THREE.Vector3,
    targetPos: THREE.Vector3,
): void {
    const place = (mesh: THREE.Mesh | null, end: THREE.Vector3, start: THREE.Vector3): void => {
        if (!mesh) return;
        mesh.position.copy(end);
        mesh.quaternion.setFromUnitVectors(
            ARROWHEAD_AXIS,
            direction.subVectors(end, start).normalize(),
        );
        if (scene && mesh.parent !== scene) scene.add(mesh);
    };
    place(pair.target, targetPos, sourcePos);
    place(pair.source, sourcePos, targetPos);
}

export function disposeArrowheads(pair: ArrowheadPair): void {
    for (const mesh of [pair.source, pair.target]) {
        mesh?.geometry.dispose();
        (mesh?.material as THREE.Material | undefined)?.dispose();
        mesh?.parent?.remove(mesh);
    }
    pair.source = null;
    pair.target = null;
}
