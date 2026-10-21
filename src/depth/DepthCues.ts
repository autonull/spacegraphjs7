import type { CardFacing, DepthMode, Projection } from '../types';
import { clamp01 } from '../utils/math';

export type { DepthMode };

/**
 * LE.15 — generic depth-cue primitives. `DepthMode` is a spectrum (not a 2D/3D toggle): each mode is a
 * camera projection/pose plus a fog density, and `depthFade` is the attenuation curve a host can apply
 * to per-node opacity when it wants a fade without scene fog. Nothing here reads host semantics.
 */

export const DEPTH_MODES: readonly DepthMode[] = ['flat', 'layered', 'depth-stack', 'orbit'];

export interface DepthTreatment {
  /** The camera projection this mode uses. */
  projection: Projection;
  /** Camera polar angle from +Y (radians); `PI / 2` looks straight down the graph plane. */
  phi: number;
  /** Whether free orbit input is enabled. */
  orbit: boolean;
  /**
   * Scene-relative attenuation strength; `0` disables the fade. The renderer converts it to a fog
   * density from the current camera distance and content depth (see `sceneFadeDensity`), so the same
   * scene reads the same at every fit instead of fading with absolute camera distance.
   */
  fade: number;
  /**
   * How the DOM cards face the camera. A card lying in the content plane is sheared into a
   * quadrilateral as soon as the camera tilts, and its text stops being readable; the 3D treatments
   * therefore face the camera (T1.19).
   */
  facing: CardFacing;
}

/** The perspective modes stay shallow enough to keep cards readable; orbit is the labelled experiment. */
export const MAX_READABLE_TILT = 0.3;

const TREATMENTS: Record<DepthMode, DepthTreatment> = {
  flat: { projection: 'orthographic', phi: Math.PI / 2, orbit: false, fade: 0, facing: 'plane' },
  layered: {
    projection: 'perspective',
    phi: Math.PI / 2 - 0.15,
    orbit: false,
    fade: 0.5,
    facing: 'plane',
  },
  'depth-stack': {
    projection: 'perspective',
    phi: Math.PI / 2 - MAX_READABLE_TILT,
    orbit: false,
    fade: 0.9,
    facing: 'plane',
  },
  orbit: { projection: 'perspective', phi: Math.PI / 2 - 0.5, orbit: true, fade: 0, facing: 'plane' },
};

export function depthTreatment(mode: DepthMode): DepthTreatment {
  return TREATMENTS[mode];
}

/** Exponential depth attenuation in `(0, 1]`: 1 at the camera, approaching 0 far away. `density <= 0` is no fade. */
export function depthFade(distance: number, density: number): number {
  if (density <= 0) return 1;
  return clamp01(Math.exp(-((density * Math.max(distance, 0)) ** 2)));
}

/**
 * Fog density for a scene-relative fade. Scaling by the camera-to-content span keeps the visible
 * attenuation stable across fits and zoom levels instead of making a distant fit fade the whole scene.
 */
export function sceneFadeDensity(strength: number, cameraDistance: number, sceneDepth: number): number {
  if (strength <= 0) return 0;
  return strength / Math.max(cameraDistance + sceneDepth, 1);
}
