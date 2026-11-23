import type { SpaceGraph } from '../../SpaceGraph';
import { calculateDistance, calculateMidpoint } from '../../utils/GestureManager';
import type { Finger, Fingering } from '../Fingering';

/**
 * Two-finger touch fingering: pinch to zoom and drag to pan.
 *
 * It never claims a single finger (`start` returns false), so it is only engaged by the input
 * manager when a second pointer arrives. Zoom goes through `CameraControls.zoom`, which is
 * projection-aware (orthographic frustum or perspective distance); pan reuses `CameraControls.pan`.
 */
export class PinchZoomFingering implements Fingering {
    private sg: SpaceGraph;
    private lastDistance = 0;
    private lastMid = { x: 0, y: 0 };
    private active = false;

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    start(_finger: Finger): boolean {
        return false;
    }

    update(_finger: Finger): boolean {
        return false;
    }

    stop(_finger: Finger): void {}

    defer(_finger: Finger): boolean {
        return false;
    }

    startMultiTouch(finger1: Finger, finger2: Finger): boolean {
        if (!this.sg?.cameraControls) return false;
        this.lastDistance = calculateDistance(finger1.position, finger2.position);
        this.lastMid = calculateMidpoint(finger1.position, finger2.position);
        this.active = true;
        return true;
    }

    updateMultiTouch(finger1: Finger, finger2: Finger): boolean {
        if (!this.active) return false;

        const distance = calculateDistance(finger1.position, finger2.position);
        if (this.lastDistance > 0 && distance > 0) {
            this.sg.cameraControls.zoom(this.lastDistance / distance);
        }
        this.lastDistance = distance;

        const mid = calculateMidpoint(finger1.position, finger2.position);
        this.sg.cameraControls.pan(mid.x - this.lastMid.x, mid.y - this.lastMid.y);
        this.lastMid = mid;

        return true;
    }

    stopMultiTouch(): void {
        this.active = false;
    }
}
