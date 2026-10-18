import type { SpaceGraph } from '../../SpaceGraph';
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
    this.lastDistance = this._distance(finger1, finger2);
    this.lastMid = this._midpoint(finger1, finger2);
    this.active = true;
    return true;
  }

  updateMultiTouch(finger1: Finger, finger2: Finger): boolean {
    if (!this.active) return false;

    const distance = this._distance(finger1, finger2);
    if (this.lastDistance > 0 && distance > 0) {
      this.sg.cameraControls.zoom(this.lastDistance / distance);
    }
    this.lastDistance = distance;

    const mid = this._midpoint(finger1, finger2);
    this.sg.cameraControls.pan(mid.x - this.lastMid.x, mid.y - this.lastMid.y);
    this.lastMid = mid;

    return true;
  }

  stopMultiTouch(): void {
    this.active = false;
  }

  private _distance(f1: Finger, f2: Finger): number {
    return Math.hypot(f1.position.x - f2.position.x, f1.position.y - f2.position.y);
  }

  private _midpoint(f1: Finger, f2: Finger): { x: number; y: number } {
    return { x: (f1.position.x + f2.position.x) / 2, y: (f1.position.y + f2.position.y) / 2 };
  }
}
