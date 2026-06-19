import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

function disposeMaterial(material: THREE.Material): void {
    material.dispose();
    const matRecord = material as unknown as Record<string, unknown>;
    for (const key of Object.keys(material)) {
        const value = matRecord[key];
        if (value && typeof value === 'object' && 'isTexture' in value && value.isTexture) {
            (value as THREE.Texture).dispose();
        }
    }
}

export function disposeObject3D(object: THREE.Object3D, removeChildren: boolean = true): void {
    for (let i = object.children.length - 1; i >= 0; i--) {
        disposeObject3D(object.children[i], removeChildren);
        if (removeChildren) {
            object.remove(object.children[i]);
        }
    }

    const obj = object as THREE.Object3D & { geometry?: THREE.BufferGeometry };
    if (obj.geometry) {
        obj.geometry.dispose();
    }

    const objWithMat = object as THREE.Object3D & {
        material?: THREE.Material | THREE.Material[];
    };
    if (objWithMat.material) {
        const materials = Array.isArray(objWithMat.material)
            ? objWithMat.material
            : [objWithMat.material];
        for (const mat of materials) {
            disposeMaterial(mat);
        }
    }

    if (object instanceof CSS2DObject || object instanceof CSS3DObject) {
        if (object.element && object.element.parentNode) {
            object.element.parentNode.removeChild(object.element);
        }
    }
}

export const ThreeDisposer = { dispose: disposeObject3D };
