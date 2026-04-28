import type { CameraControls } from '../../core/CameraControls';
import type { Finger, Fingering } from '../Fingering';

type CameraAction = 'orbit' | 'pan' | 'zoom';

interface CameraFingeringState {
    action: CameraAction;
    active: boolean;
    startPos: { x: number; y: number };
}

const FINGER_BUTTONS: Record<CameraAction, number> = {
    orbit: 1,
    pan: 4,
    zoom: 2,
};

export class CameraFingering implements Fingering {
    private camera: CameraControls;
    private states = new Map<CameraAction, CameraFingeringState>();

    constructor(camera: CameraControls) {
        this.camera = camera;
        this.initStates();
    }

    private initStates(): void {
        (['orbit', 'pan', 'zoom'] as CameraAction[]).forEach(action => {
            this.states.set(action, { action, active: false, startPos: { x: 0, y: 0 } });
        });
    }

    private getActionForButton(buttons: number): CameraAction | null {
        for (const [action, btn] of Object.entries(FINGER_BUTTONS)) {
            if (btn === buttons) return action as CameraAction;
        }
        return null;
    }

    private getState(action: CameraAction): CameraFingeringState {
        return this.states.get(action)!;
    }

    start(finger: Finger): boolean {
        const action = this.getActionForButton(finger.buttons);
        if (!action) return false;

        const state = this.getState(action);
        state.active = true;
        state.startPos = { x: finger.position.x, y: finger.position.y };
        return true;
    }

    update(finger: Finger): boolean {
        const action = this.getActionForButton(finger.buttons);
        if (!action) return false;

        const state = this.getState(action);
        if (!state.active) return false;

        const dx = finger.position.x - state.startPos.x;
        const dy = finger.position.y - state.startPos.y;

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

        state.startPos = { x: finger.position.x, y: finger.position.y };
        return true;
    }

    stop(_finger: Finger): void {
        for (const state of this.states.values()) {
            state.active = false;
        }
    }

    defer(_finger: Finger): boolean {
        return false;
    }
}

export class CameraOrbitingFingering extends CameraFingering {
    constructor(camera: CameraControls) {
        super(camera);
    }
}

export class CameraPanningFingering extends CameraFingering {
    constructor(camera: CameraControls) {
        super(camera);
    }
}

export class CameraZoomingFingering extends CameraFingering {
    constructor(camera: CameraControls) {
        super(camera);
    }
}