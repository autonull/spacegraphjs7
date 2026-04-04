import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

/**
 * Utility to reliably recursively dispose of geometry, materials, and textures
 * of a ThreeJS object to prevent WebGL context memory leaks.
 */
export class ThreeDisposer {
    /**
     * Recursively clean up an Object3D, disposing of geometries, materials,
     * and optionally removing CSS backing DOM elements.
     *
     * @param object The root Object3D to recursively dispose.
     * @param removeChildren Whether to empty the object's children array (default true).
     */
    static dispose(object: THREE.Object3D, removeChildren: boolean = true): void {
        // recursively dispose children first
        for (let i = object.children.length - 1; i >= 0; i--) {
            ThreeDisposer.dispose(object.children[i], removeChildren);
            if (removeChildren) {
                object.remove(object.children[i]);
            }
        }

        // Deal with Geometries
        const obj = object as THREE.Object3D & { geometry?: THREE.BufferGeometry };
        if (obj.geometry) {
            obj.geometry.dispose();
        }

        const objWithMat = object as THREE.Object3D & {
            material?: THREE.Material | THREE.Material[];
        };
        if (objWithMat.material) {
            const mat = objWithMat.material;
            if (Array.isArray(mat)) {
                for (const m of mat) {
                    this.disposeMaterial(m);
                }
            } else {
                this.disposeMaterial(mat);
            }
        }

        // Deal with CSS renderers causing memory leaks
        if (object instanceof CSS2DObject || object instanceof CSS3DObject) {
            if (object.element && object.element.parentNode) {
                object.element.parentNode.removeChild(object.element);
            }
        }
    }

    /**
     * Clean up a material and all its mapped textures.
     */
    private static disposeMaterial(material: THREE.Material): void {
        material.dispose();

        // Iterate over properties to find textures to dispose
        for (const key of Object.keys(material)) {
            const value = (material as unknown as Record<string, unknown>)[key];
            if (value && typeof value === 'object' && 'isTexture' in value && value.isTexture) {
                (value as THREE.Texture).dispose();
            }
        }
    }
}
