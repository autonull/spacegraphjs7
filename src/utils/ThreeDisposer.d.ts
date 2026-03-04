import * as THREE from 'three';
/**
 * Utility to reliably recursively dispose of geometry, materials, and textures
 * of a ThreeJS object to prevent WebGL context memory leaks.
 */
export declare class ThreeDisposer {
    /**
     * Recursively clean up an Object3D, disposing of geometries, materials,
     * and optionally removing CSS backing DOM elements.
     *
     * @param object The root Object3D to recursively dispose.
     * @param removeChildren Whether to empty the object's children array (default true).
     */
    static dispose(object: THREE.Object3D, removeChildren?: boolean): void;
    /**
     * Clean up a material and all its mapped textures.
     */
    private static disposeMaterial;
}
