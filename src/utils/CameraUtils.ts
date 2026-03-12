import * as THREE from 'three';

export class CameraUtils {
    /**
     * Calculates the target center and camera distance (Z) needed to frame a set of nodes.
     * Uses the camera's FOV to compute the bounding box coverage.
     *
     * @param nodes Array of nodes with a `.position` property (THREE.Vector3)
     * @param camera The perspective camera used to calculate the FOV
     * @param padding Additional distance to pad the view (default: 100)
     * @param minDistance The minimum allowed distance for the camera (default: 200)
     * @returns An object containing the optimal center point and cameraZ distance.
     */
    static calculateFitView(
        nodes: any[],
        camera: THREE.PerspectiveCamera,
        padding: number = 100,
        minDistance: number = 200
    ): { center: THREE.Vector3, cameraZ: number } | null {
        if (!nodes || nodes.length === 0) return null;

        const box = new THREE.Box3();
        nodes.forEach((node) => {
            if (node && node.position) {
                box.expandByPoint(node.position);
            }
        });

        const center = new THREE.Vector3();
        box.getCenter(center);

        const size = new THREE.Vector3();
        box.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

        // Add padding and a minimum distance
        cameraZ += padding;
        cameraZ = Math.max(cameraZ, minDistance);

        return { center, cameraZ };
    }
}
