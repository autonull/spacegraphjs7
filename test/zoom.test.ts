import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CameraControls } from '../src/core/CameraControls';
import { clamp, denormalizeZoom, normalizeZoom, type ZoomRange } from '../src/core/zoom';

const PERSPECTIVE: ZoomRange = { min: 10, max: 10000, closerIsLarger: false };
const ORTHO: ZoomRange = { min: 0.01, max: 100, closerIsLarger: true };

describe('normalizeZoom', () => {
  it('maps perspective distance so the closest is 1 and the farthest is 0', () => {
    expect(normalizeZoom(10, PERSPECTIVE)).toBeCloseTo(1, 6);
    expect(normalizeZoom(10000, PERSPECTIVE)).toBeCloseTo(0, 6);
    expect(normalizeZoom(5, PERSPECTIVE)).toBe(1);
    expect(normalizeZoom(20000, PERSPECTIVE)).toBe(0);
  });

  it('maps orthographic zoom so the closest is 1 and the farthest is 0', () => {
    expect(normalizeZoom(100, ORTHO)).toBeCloseTo(1, 6);
    expect(normalizeZoom(0.01, ORTHO)).toBeCloseTo(0, 6);
    expect(normalizeZoom(0.001, ORTHO)).toBe(0);
    expect(normalizeZoom(1000, ORTHO)).toBe(1);
  });

  it('is monotonic in the middle of the range', () => {
    expect(normalizeZoom(100, PERSPECTIVE)).toBeGreaterThan(normalizeZoom(1000, PERSPECTIVE));
    expect(normalizeZoom(1, ORTHO)).toBeGreaterThan(normalizeZoom(0.1, ORTHO));
  });
});

describe('denormalizeZoom', () => {
  it('inverts normalizeZoom for both projections', () => {
    for (const range of [PERSPECTIVE, ORTHO]) {
      for (const value of [0, 0.25, 0.5, 0.75, 1]) {
        expect(denormalizeZoom(normalizeZoom(denormalizeZoom(value, range), range), range)).toBeCloseTo(
          denormalizeZoom(value, range),
          6
        );
      }
    }
  });

  it('clamps out-of-range normalized values to the range', () => {
    expect(denormalizeZoom(-1, PERSPECTIVE)).toBeCloseTo(10000, 6);
    expect(denormalizeZoom(2, PERSPECTIVE)).toBeCloseTo(10, 6);
  });
});

describe('clamp', () => {
  it('bounds a value to both ends', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('CameraControls orthographic mode', () => {
  const makeControls = () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000);
    camera.position.set(0, 0, 500);
    return { controls: new CameraControls(camera, container), camera };
  };

  it('switches to an orthographic camera and back', () => {
    const { controls } = makeControls();
    expect(controls.isUsingOrthographic).toBe(false);
    controls.toggleOrthographic();
    expect(controls.isUsingOrthographic).toBe(true);
    expect(controls.getOrthoCamera()?.isOrthographicCamera).toBe(true);
    controls.toggleOrthographic();
    expect(controls.isUsingOrthographic).toBe(false);
  });

  it('derives a frustum that matches the perspective framing at the same distance', () => {
    const { controls } = makeControls();
    controls.toggleOrthographic();
    const ortho = controls.getOrthoCamera()!;
    const expectedHeight = 2 * 500 * Math.tan(THREE.MathUtils.degToRad(75 / 2));
    expect(ortho.top - ortho.bottom).toBeCloseTo(expectedHeight, 3);
    expect(ortho.right - ortho.left).toBeCloseTo(expectedHeight * (800 / 600), 3);
  });

  it('scales orthographic zoom instead of distance and clamps it', () => {
    const { controls } = makeControls();
    controls.toggleOrthographic();
    const ortho = controls.getOrthoCamera()!;
    const startRadius = controls.spherical.radius;
    controls.zoom(2);
    controls.update();
    expect(ortho.zoom).toBeCloseTo(0.5, 4);
    expect(controls.spherical.radius).toBeCloseTo(startRadius, 6);
    for (let i = 0; i < 40; i++) {
      controls.zoom(0.1);
      controls.update();
    }
    expect(ortho.zoom).toBeLessThanOrEqual(100);
  });

  it('does not orbit in orthographic mode', () => {
    const { controls } = makeControls();
    controls.toggleOrthographic();
    const before = controls.spherical.theta;
    controls.rotate(100, 100);
    controls.update();
    expect(controls.spherical.theta).toBeCloseTo(before, 6);
  });
});
