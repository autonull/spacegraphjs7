import * as THREE from 'three';

export interface CullingSettings {
    enabled?: boolean;
    cullingRadius?: number;      // Manual override for bounding sphere radius
    forceRefreshBounds?: boolean; // If bounds change dynamically
}

/**
 * CullingManager
 * Computes camera frustum each frame and toggles Object3D.visible for objects
 * completely outside the view, drastically saving rasterisation time for huge graphs.
 */
export class CullingManager {
    private camera!: THREE.Camera;
    private frustum = new THREE.Frustum();
    private projScreenMatrix = new THREE.Matrix4();
    private objects = new Map<THREE.Object3D, CullingSettings>();
    private boundsCache = new Map<THREE.Object3D, THREE.Sphere>();

    /**
     * Set the current active rendering camera to compute the frustum from.
     */
    setCamera(camera: THREE.Camera): void {
        this.camera = camera;
    }

    /**
     * Add an object to the culling manager.
     */
    registerObject(object: THREE.Object3D, settings: CullingSettings = { enabled: true }): void {
        this.objects.set(object, settings);
    }

    /**
     * Stop managing an object's visibility.
     */
    unregisterObject(object: THREE.Object3D): void {
        this.objects.delete(object);
        this.boundsCache.delete(object);
    }

    /**
     * Called by the render loop prior to rendering.
     * Computes frustum and toggles visibility of all registered objects.
     */
    update(): void {
        if (!this.camera) return;

        // 1. Update viewing frustum based on current camera position
        this.camera.updateMatrixWorld();
        this.projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

        // 2. Iterate objects and check intersection
        for (const [object, settings] of this.objects.entries()) {
            if (settings.enabled === false) continue;

            const bounds = this.getBounds(object, settings);
            if (!bounds) continue; // unable to compute bounds

            // Check visibility
            const isVisible = this.frustum.intersectsSphere(bounds);

            // Only update if changed to avoid unnecessary reactivity triggers
            if (object.visible !== isVisible) {
                object.visible = isVisible;
            }
        }
    }

    /**
     * Calculates or retrieves a cached bounding sphere for the object.
     */
    private getBounds(object: THREE.Object3D, settings: CullingSettings): THREE.Sphere | null {
        if (settings.forceRefreshBounds || !this.boundsCache.has(object)) {
            let sphere = new THREE.Sphere();

            if (settings.cullingRadius) {
                // Manual radius override (fastest path)
                object.updateMatrixWorld();
                sphere.set(object.position.clone().applyMatrix4(object.matrixWorld), settings.cullingRadius);
            } else if ((object as any).geometry) {
                // Compute from geometry
                const geom = (object as any).geometry as THREE.BufferGeometry;
                if (!geom.boundingSphere) geom.computeBoundingSphere();
                if (geom.boundingSphere) {
                    object.updateMatrixWorld();
                    sphere.copy(geom.boundingSphere);
                    sphere.applyMatrix4(object.matrixWorld);
                }
            } else {
                // Fallback: build box from all children and get sphere
                const box = new THREE.Box3().setFromObject(object);
                if (box.isEmpty()) return null;
                box.getBoundingSphere(sphere);
            }

            this.boundsCache.set(object, sphere);
        } else {
            // Retrieve cache but update its center based on the object's current position
            const sphere = this.boundsCache.get(object)!;
            object.updateMatrixWorld();

            // Reapply position. (Assuming radius hasn't changed).
            sphere.center.setFromMatrixPosition(object.matrixWorld);
        }

        return this.boundsCache.get(object) ?? null;
    }

    /**
     * Clear all tracking.
     */
    dispose(): void {
        this.objects.clear();
        this.boundsCache.clear();
    }
}
