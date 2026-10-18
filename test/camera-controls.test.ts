import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CameraControls } from '../src/core/CameraControls';

const makeControls = () => {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 800 });
  Object.defineProperty(container, 'clientHeight', { value: 600 });
  const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000);
  camera.position.set(0, 0, 500);
  const controls = new CameraControls(camera, container, { keyboard: false });
  controls.update();
  return { controls, camera };
};

describe('U3.15 orbit gating and camera pose', () => {
  afterEach(() => vi.restoreAllMocks());

  it('ignores rotate input once orbit is disabled', () => {
    const { controls } = makeControls();
    controls.setOrbitEnabled(false);
    controls.rotate(50, 50);
    controls.update();
    expect(controls.spherical.theta).toBeCloseTo(0, 6);
    expect(controls.spherical.phi).toBeCloseTo(Math.PI / 2, 6);
  });

  it('rotates once orbit is enabled', () => {
    const { controls } = makeControls();
    controls.setOrbitEnabled(true);
    controls.rotate(50, 0);
    controls.update();
    expect(controls.spherical.theta).not.toBeCloseTo(0, 6);
  });

  it('applies a pose immediately when the duration is zero', () => {
    const { controls, camera } = makeControls();
    controls.setPolar(Math.PI / 4, Math.PI / 2, 0);
    controls.update();
    expect(controls.spherical.phi).toBeCloseTo(Math.PI / 4, 6);
    expect(controls.spherical.theta).toBeCloseTo(Math.PI / 2, 6);
    expect(camera.position.y).toBeGreaterThan(0);
  });

  it('animates toward the pose over the given duration', () => {
    const now = vi.spyOn(performance, 'now');
    now.mockReturnValue(0);
    const { controls } = makeControls();
    const startPhi = controls.spherical.phi;
    controls.setPolar(Math.PI / 4, 0, 1);
    now.mockReturnValue(500);
    controls.update();
    expect(controls.spherical.phi).toBeLessThan(startPhi);
    expect(controls.spherical.phi).toBeGreaterThan(Math.PI / 4);
    now.mockReturnValue(1000);
    controls.update();
    expect(controls.spherical.phi).toBeCloseTo(Math.PI / 4, 6);
  });
});

describe('orthographic fit zoom', () => {
  const makeOrthoControls = () => {
    const container = document.createElement('div');
    const camera = new THREE.OrthographicCamera(-500, 500, 500, -500, 0.1, 10000);
    camera.position.set(0, 0, 500);
    const controls = new CameraControls(camera, container, { keyboard: false });
    controls.update();
    return { controls, camera };
  };

  it('animates the frustum zoom toward the target value', () => {
    const now = vi.spyOn(performance, 'now');
    now.mockReturnValue(0);
    const { controls, camera } = makeOrthoControls();
    controls.flyTo(new THREE.Vector3(0, 0, 0), 500, 1, 2);
    now.mockReturnValue(500);
    controls.update();
    expect(camera.zoom).toBeGreaterThan(1);
    expect(camera.zoom).toBeLessThan(2);
    now.mockReturnValue(1000);
    controls.update();
    expect(camera.zoom).toBeCloseTo(2, 6);
  });

  it('ignores a zoom target for a perspective camera', () => {
    const now = vi.spyOn(performance, 'now');
    now.mockReturnValue(0);
    const { controls } = makeControls();
    controls.flyTo(new THREE.Vector3(0, 0, 0), 300, 1, 2);
    now.mockReturnValue(1000);
    controls.update();
    expect(controls.spherical.radius).toBeCloseTo(300, 6);
  });
});
