import type { CameraControls } from '../core';
import { clientToNdc } from '../utils/projection';
import type { WheelEventData } from './InputManager';

/** How much one wheel pixel zooms. A factor above one moves the camera away. */
const ZOOM_PER_PIXEL = 0.0015;

/** The largest zoom a single wheel event may apply, so a fast flick stays controllable. */
const MAX_PIXELS_PER_EVENT = 400;

/** The wheel's delta in pixels, whatever unit the browser reported. */
function wheelPixels(deltaY: number, deltaMode: number): number {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
  return Math.max(-MAX_PIXELS_PER_EVENT, Math.min(MAX_PIXELS_PER_EVENT, pixels));
}

/**
 * The wheel's camera gesture: zoom about the point under the pointer, so the content the reader
 * points at stays where it is. Scrolling up zooms in.
 */
export function zoomCameraOnWheel(
  camera: CameraControls,
  canvas: { getBoundingClientRect(): { left: number; top: number; width: number; height: number } },
  event: WheelEventData
): void {
  const pixels = wheelPixels(event.deltaY, event.deltaMode);
  if (!pixels) return;

  const ndc = clientToNdc(event.x, event.y, canvas.getBoundingClientRect());
  camera.zoomAt(ndc, Math.exp(pixels * ZOOM_PER_PIXEL));
}
