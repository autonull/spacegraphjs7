import * as THREE from 'three';

export interface LODSettings {
    enabled?: boolean;
    levels: {
        distance: number;       // The camera distance at which this level activates
        object: THREE.Object3D; // The Object3D to display at this distance
    }[];
}

/**
 * LODManager (Level of Detail)
 * Monitors camera distance and swaps between different mesh resolutions
 * automatically to save GPU vertex shading time at a distance.
 */
export class LODManager {
    private camera!: THREE.Camera;
    private objects = new Map<THREE.Object3D, LODSettings>();
    private currentLevels = new Map<THREE.Object3D, number>();

    /**
     * Set the active camera to calculate distance from.
     */
    setCamera(camera: THREE.Camera): void {
        this.camera = camera;
    }

    /**
     * Register a root object and its LOD levels.
     * The root object acts as the anchor/tracker, but its children (the levels)
     * are what get toggled rapidly.
     */
    registerObject(rootObject: THREE.Object3D, settings: LODSettings): void {
        // Sort levels by distance ascending (closest first)
        settings.levels.sort((a, b) => a.distance - b.distance);

        // Hide all but the first level initially
        settings.levels.forEach((level, index) => {
            level.object.visible = (index === 0);

            // Ensure level objects are actually children of the root tracker
            if (level.object.parent !== rootObject) {
                rootObject.add(level.object);
            }
        });

        this.objects.set(rootObject, settings);
        this.currentLevels.set(rootObject, 0);
    }

    /**
     * Stop managing this object's LOD.
     */
    unregisterObject(rootObject: THREE.Object3D): void {
        this.objects.delete(rootObject);
        this.currentLevels.delete(rootObject);
    }

    /**
     * Called by the render loop prior to rendering.
     */
    update(): void {
        if (!this.camera) return;

        const cameraPos = this.camera.position;

        for (const [rootObject, settings] of this.objects.entries()) {
            if (settings.enabled === false) continue;

            const distance = cameraPos.distanceTo(rootObject.position);
            const activeLevelIndex = this.calculateLevelIndex(distance, settings.levels);

            const currentActiveIndex = this.currentLevels.get(rootObject);

            if (currentActiveIndex !== activeLevelIndex) {
                // Swap visibility
                if (currentActiveIndex !== undefined && settings.levels[currentActiveIndex]) {
                    settings.levels[currentActiveIndex].object.visible = false;
                }
                if (settings.levels[activeLevelIndex]) {
                    settings.levels[activeLevelIndex].object.visible = true;
                }

                this.currentLevels.set(rootObject, activeLevelIndex);
            }
        }
    }

    /**
     * Find the appropriate level index based on distance.
     * Assumes settings.levels is sorted ascending by distance.
     */
    private calculateLevelIndex(distance: number, levels: LODSettings['levels']): number {
        for (let i = levels.length - 1; i >= 0; i--) {
            if (distance >= levels[i].distance) {
                return i;
            }
        }
        return 0; // default to closest / lowest distance tier
    }

    dispose(): void {
        this.objects.clear();
        this.currentLevels.clear();
    }
}
