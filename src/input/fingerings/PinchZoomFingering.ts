import type { SpaceGraph } from '../../SpaceGraph';
import type { Finger, Fingering } from '../Fingering';

export class PinchZoomFingering implements Fingering {
    private sg: SpaceGraph;
    private initialDistance: number = 0;
    private initialZoom: number = 0;
    private active: boolean = false;
    private startFingers: { finger1: Finger; finger2: Finger } | null = null;

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

        this.startFingers = { finger1, finger2 };
        this.initialDistance = this.calculateDistance(finger1, finger2);
        this.initialZoom = this.sg.cameraControls.spherical.radius;
        this.active = true;

        return true;
    }

    updateMultiTouch(finger1: Finger, finger2: Finger): boolean {
        if (!this.active || !this.startFingers) return false;

        const currentDistance = this.calculateDistance(finger1, finger2);
        const delta = this.initialDistance - currentDistance;

        const zoomFactor = 1 + delta * 0.005;
        const newRadius = this.initialZoom * zoomFactor;

        this.sg.cameraControls.spherical.radius = newRadius;
        this.sg.cameraControls.update();

        return true;
    }

    stopMultiTouch(): void {
        this.active = false;
        this.startFingers = null;
    }

    private calculateDistance(f1: Finger, f2: Finger): number {
        const dx = f1.position.x - f2.position.x;
        const dy = f1.position.y - f2.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
