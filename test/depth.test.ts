// @vitest-environment node
import { describe, expect, test } from 'vitest';
import {
  DEPTH_MODES,
  MAX_READABLE_TILT,
  depthFade,
  depthTreatment,
  sceneFadeDensity,
} from '../src/depth/DepthCues';

// LE.15 — the depth-cue primitives are pure: a mode maps to a projection/pose/fade, and the fade curve
// attenuates with distance. No DOM, no WebGL.

describe('depth treatment', () => {
  test('flat is the orthographic baseline and the others are the perspective spectrum', () => {
    expect(depthTreatment('flat')).toMatchObject({ projection: 'orthographic', orbit: false, fade: 0 });
    for (const mode of ['layered', 'depth-stack', 'orbit'] as const) {
      expect(depthTreatment(mode).projection).toBe('perspective');
    }
  });

  test('only orbit enables free orbit, and only flat removes the depth fade', () => {
    expect(DEPTH_MODES.filter((mode) => depthTreatment(mode).orbit)).toEqual(['orbit']);
    expect(DEPTH_MODES.filter((mode) => depthTreatment(mode).fade > 0)).toEqual(['layered', 'depth-stack']);
  });

  test('the camera tilts further as depth increases, and flat looks straight down', () => {
    expect(depthTreatment('flat').phi).toBeCloseTo(Math.PI / 2);
    expect(depthTreatment('layered').phi).toBeGreaterThan(depthTreatment('depth-stack').phi);
    // Layered/depth-stack are capped for card legibility; orbit remains the labelled experiment.
    expect(depthTreatment('depth-stack').phi).toBeCloseTo(Math.PI / 2 - MAX_READABLE_TILT);
    expect(depthTreatment('orbit').phi).toBeLessThan(depthTreatment('depth-stack').phi);
  });

  test('depth-stack fades harder than layered', () => {
    expect(depthTreatment('depth-stack').fade).toBeGreaterThan(depthTreatment('layered').fade);
  });

  test('the tilted treatments face the camera and the flat baseline does not', () => {
    // A card lying in the content plane is sheared into a quadrilateral as soon as the camera
    // tilts, so the 3D treatments turn the cards to face the reader (T1.19).
    expect(depthTreatment('flat').facing).toBe('plane');
    for (const mode of ['layered', 'depth-stack', 'orbit'] as const) {
      expect(depthTreatment(mode).facing).toBe('camera');
    }
  });
});

describe('depth fade', () => {
  test('is 1 at the camera and 1 when fade is disabled', () => {
    expect(depthFade(0, 0.003)).toBe(1);
    expect(depthFade(500, 0)).toBe(1);
  });

  test('decreases monotonically with distance and never leaves (0, 1]', () => {
    const near = depthFade(100, 0.003);
    const far = depthFade(900, 0.003);
    expect(far).toBeLessThan(near);
    expect(far).toBeGreaterThan(0);
    expect(near).toBeLessThanOrEqual(1);
  });

  test('a denser fade attenuates sooner', () => {
    expect(depthFade(500, 0.006)).toBeLessThan(depthFade(500, 0.002));
  });
});

describe('scene-relative fade', () => {
  test('is disabled for zero strength and never divides by zero', () => {
    expect(sceneFadeDensity(0, 1000, 200)).toBe(0);
    expect(Number.isFinite(sceneFadeDensity(0.5, 0, 0))).toBe(true);
  });

  test('keeps the same visible attenuation when the fit distance scales the scene', () => {
    // The density shrinks as the camera and scene grow, so the fog factor at the content plane stays
    // in the same band instead of fading the whole graph out at a distant fit.
    const near = depthFade(500, sceneFadeDensity(0.5, 500, 200));
    const far = depthFade(5000, sceneFadeDensity(0.5, 5000, 200));

    expect(Math.abs(near - far)).toBeLessThan(0.15);
    expect(near).toBeGreaterThan(0.5);
  });

  test('at a fixed camera distance a deeper scene fades more gradually', () => {
    expect(sceneFadeDensity(0.5, 1000, 400)).toBeLessThan(sceneFadeDensity(0.5, 1000, 100));
  });
});
