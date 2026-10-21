import type { CameraControls } from '../../core';
import type { Finger, Fingering } from '../Fingering';

export type CameraAction = 'orbit' | 'pan';

/** The pointer's button mask: the bit that is set while the button is held. */
const RIGHT_BUTTON = 2;
const MIDDLE_BUTTON = 4;

interface CameraGesture {
  action: CameraAction;
  button: number;
}

/**
 * The camera's mouse map. The right button pans the view and the middle button orbits it; the left
 * button belongs to the nodes (drag, select, box-select) and the wheel zooms, which the camera
 * handles itself because a wheel is not a pointer gesture.
 */
const CAMERA_GESTURES: readonly CameraGesture[] = [
  { action: 'pan', button: RIGHT_BUTTON },
  { action: 'orbit', button: MIDDLE_BUTTON },
];

export class CameraFingering implements Fingering {
  /** The camera uses buttons the nodes do not, so the generic interaction still runs. */
  readonly claimsGesture = false;

  private camera: CameraControls;
  private activeGesture: CameraGesture | null = null;
  private startPos = { x: 0, y: 0 };

  constructor(camera: CameraControls) {
    this.camera = camera;
  }

  start(finger: Finger): boolean {
    const gesture = CAMERA_GESTURES.find((g) => g.button === finger.buttons);
    if (!gesture) return false;

    this.activeGesture = gesture;
    this.startPos = { x: finger.position.x, y: finger.position.y };
    return true;
  }

  update(finger: Finger): boolean {
    if (!this.activeGesture) return false;

    const dx = finger.position.x - this.startPos.x;
    const dy = finger.position.y - this.startPos.y;

    if (this.activeGesture.action === 'orbit') this.camera.rotate(dx, dy);
    else this.camera.pan(dx, dy);

    this.startPos = { x: finger.position.x, y: finger.position.y };
    return true;
  }

  stop(_finger: Finger): void {
    this.activeGesture = null;
  }

  /** The camera may hand the gesture over: a node interaction can claim the pointer. */
  defer(_finger: Finger): boolean {
    return true;
  }
}

export function createCameraFingering(camera: CameraControls): CameraFingering {
  return new CameraFingering(camera);
}
