import type { CameraControls } from '../../core/CameraControls';
import { type Finger, type Fingering } from '../Fingering';

export class CameraOrbitingFingering implements Fingering {
    private camera: CameraControls;
    private startPos = { x: 0, y: 0 };
    private active = false;

    constructor(camera: CameraControls) {
        this.camera = camera;
    }

    start(finger: Finger): boolean {
        if (finger.buttons !== 1) return false;
        this.startPos = { x: finger.position.x, y: finger.position.y };
        this.active = true;
        return true;
    }

    update(finger: Finger): boolean {
        if (!this.active) return false;
        const dx = finger.position.x - this.startPos.x;
        const dy = finger.position.y - this.startPos.y;
        this.camera.rotate(dx, dy);
        this.startPos = { x: finger.position.x, y: finger.position.y };
        return true;
    }

    stop(_finger: Finger): void {
        this.active = false;
    }

    defer(_finger: Finger): boolean {
        return false;
    }
}

export class CameraPanningFingering implements Fingering {
    private camera: CameraControls;
    private startPos = { x: 0, y: 0 };
    private active = false;

    constructor(camera: CameraControls) {
        this.camera = camera;
    }

    start(finger: Finger): boolean {
        if (finger.buttons !== 4) return false;
        this.startPos = { x: finger.position.x, y: finger.position.y };
        this.active = true;
        return true;
    }

    update(finger: Finger): boolean {
        if (!this.active) return false;
        const dx = finger.position.x - this.startPos.x;
        const dy = finger.position.y - this.startPos.y;
        this.camera.pan(dx, dy);
        this.startPos = { x: finger.position.x, y: finger.position.y };
        return true;
    }

    stop(_finger: Finger): void {
        this.active = false;
    }

    defer(_finger: Finger): boolean {
        return false;
    }
}

export class CameraZoomingFingering implements Fingering {
    private camera: CameraControls;
    private startY = 0;
    private active = false;

    constructor(camera: CameraControls) {
        this.camera = camera;
    }

    start(finger: Finger): boolean {
        if (finger.buttons !== 2) return false;
        this.startY = finger.position.y;
        this.active = true;
        return true;
    }

    update(finger: Finger): boolean {
        if (!this.active) return false;
        const dy = finger.position.y - this.startY;
        const factor = dy > 0 ? 1.02 : 1 / 1.02;
        this.camera.zoom(Math.pow(factor, Math.abs(dy) * 0.1));
        this.startY = finger.position.y;
        return true;
    }

    stop(_finger: Finger): void {
        this.active = false;
    }

    defer(_finger: Finger): boolean {
        return false;
    }
}
