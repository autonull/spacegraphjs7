import type { DepthMode, Projection } from '../types';

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
  /** Exponential fog density for depth attenuation; `0` disables the fade. */
  fade: number;
}

const TREATMENTS: Record<DepthMode, DepthTreatment> = {
  flat: { projection: 'orthographic', phi: Math.PI / 2, orbit: false, fade: 0 },
  layered: { projection: 'perspective', phi: Math.PI / 2 - 0.15, orbit: false, fade: 0.0012 },
  'depth-stack': { projection: 'perspective', phi: Math.PI / 2 - 0.45, orbit: false, fade: 0.0032 },
  orbit: { projection: 'perspective', phi: Math.PI / 2 - 0.5, orbit: true, fade: 0 },
};

export function depthTreatment(mode: DepthMode): DepthTreatment {
  return TREATMENTS[mode];
}

/** Exponential depth attenuation in `(0, 1]`: 1 at the camera, approaching 0 far away. `density <= 0` is no fade. */
export function depthFade(distance: number, density: number): number {
  if (density <= 0) return 1;
  return Math.max(0, Math.min(1, Math.exp(-((density * Math.max(distance, 0)) ** 2))));
}
