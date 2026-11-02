import { createCameraFingering, PinchZoomFingering } from '../input/fingerings';
import { FingeringPriority } from '../core/constants';
import type { WheelEventData } from '../input/InputManager';
import { zoomCameraOnWheel } from '../input/CameraWheel';
import type { SpaceGraph } from '../SpaceGraph';

export class InputController {
    constructor(readonly sg: SpaceGraph) {}

    registerFingerings(): void {
        this.sg.input.registerFingering(
            createCameraFingering(this.sg.cameraControls),
            FingeringPriority.CAMERA,
        );
        this.sg.input.registerFingering(
            new PinchZoomFingering(this.sg),
            FingeringPriority.PINCH_ZOOM,
        );
        this.sg.events.on('input:camera:wheel', (e) => this.#onCameraWheel(e as WheelEventData));
    }

    #onCameraWheel(e: WheelEventData): void {
        const canvas = this.sg.renderer.renderer.domElement;
        zoomCameraOnWheel(this.sg.cameraControls, canvas, e);
        (
            e as { originalEvent?: { preventDefault?: () => void } }
        ).originalEvent?.preventDefault?.();
    }
}
