import type { CameraControls } from '../../core/CameraControls';
import type { Fingering, Finger } from '../Fingering';

export type CameraAction = 'orbit' | 'pan' | 'zoom';

interface CameraFingeringConfig {
    action: CameraAction;
    button: number;
}

const CAMERA_FINGERING_CONFIGS: CameraFingeringConfig[] = [
    { action: 'orbit', button: 1 },
    { action: 'pan', button: 4 },
    { action: 'zoom', button: 2 },
];

export class CameraFingering implements Fingering {
    private camera: CameraControls;
    private activeConfig: CameraFingeringConfig | null = null;
    private startPos = { x: 0, y: 0 };

    constructor(camera: CameraControls) {
        this.camera = camera;
    }

    private getConfigForButton(buttons: number): CameraFingeringConfig | null {
        return CAMERA_FINGERING_CONFIGS.find(c => c.button === buttons) ?? null;
    }

    start(finger: Finger): boolean {
        const config = this.getConfigForButton(finger.buttons);
        if (!config) return false;

        this.activeConfig = config;
        this.startPos = { x: finger.position.x, y: finger.position.y };
        return true;
    }

    update(finger: Finger): boolean {
        if (!this.activeConfig) return false;

        const dx = finger.position.x - this.startPos.x;
        const dy = finger.position.y - this.startPos.y;
        const { action } = this.activeConfig;

        switch (action) {
            case 'orbit':
                this.camera.rotate(dx, dy);
                break;
            case 'pan':
                this.camera.pan(dx, dy);
                break;
            case 'zoom': {
                const factor = dy > 0 ? 1.02 : 1 / 1.02;
                this.camera.zoom(Math.pow(factor, Math.abs(dy) * 0.1));
                break;
            }
        }

        this.startPos = { x: finger.position.x, y: finger.position.y };
        return true;
    }

    stop(_finger: Finger): void {
        this.activeConfig = null;
    }

    defer(_finger: Finger): boolean {
        return false;
    }
}

export function createCameraFingering(camera: CameraControls, _action: CameraAction): CameraFingering {
    const fingering = new CameraFingering(camera);
    return fingering;
}