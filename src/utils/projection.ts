import { Camera, Vector3 } from 'three';

/**
 * The projection helpers every overlay needs to place a world position on the screen.
 */

/** A world position in normalised device coordinates: -1 to 1 across the viewport. */
export function projectToNdc(position: Vector3, camera: Camera): Vector3 {
  return position.clone().project(camera);
}

/**
 * A client position in normalised device coordinates: -1 to 1 across the element's own bounds.
 */
export function clientToNdc(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number }
): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

/**
 * A world position in screen pixels, measured from the canvas' top left.
 */
export function worldToScreen(
  position: Vector3,
  camera: Camera,
  canvas: { clientWidth: number; clientHeight: number }
): { x: number; y: number } {
  const projected = projectToNdc(position, camera);
  return {
    x: (projected.x * 0.5 + 0.5) * canvas.clientWidth,
    y: (-projected.y * 0.5 + 0.5) * canvas.clientHeight,
  };
}

/**
 * A world position in client pixels, measured from the viewport's top left. The canvas' own offset
 * on the page is added, so the point lands where the reader sees it.
 */
export function worldToClient(
  position: Vector3,
  camera: Camera,
  canvas: { getBoundingClientRect(): { left: number; top: number; width: number; height: number } }
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const screen = worldToScreen(position, camera, {
    clientWidth: rect.width,
    clientHeight: rect.height,
  });
  return { x: screen.x + rect.left, y: screen.y + rect.top };
}
