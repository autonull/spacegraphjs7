import { describe, expect, test } from 'vitest';
import { DEPTH_MODES, depthFade, depthTreatment } from '../src/depth/DepthCues';

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
    expect(depthTreatment('depth-stack').phi).toBeGreaterThan(depthTreatment('orbit').phi);
  });

  test('depth-stack fades harder than layered', () => {
    expect(depthTreatment('depth-stack').fade).toBeGreaterThan(depthTreatment('layered').fade);
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
