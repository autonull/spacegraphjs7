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

describe('the pan and the zoom of the hand', () => {
  it('pans by the world size of a pixel, so the view follows the cursor', () => {
    const { controls } = makeControls();
    const perPixel = controls.worldUnitsPerPixel;
    controls.pan(10, 0);
    controls.update();
    expect(controls.target.x).toBeCloseTo(-10 * perPixel, 6);
  });

  it('keeps the point under the pointer where it is when zooming', () => {
    const { controls, camera } = makeControls();
    const ndc = { x: 0.5, y: 0 };
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const pointUnder = () => {
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
      const hit = new THREE.Vector3();
      ray.ray.intersectPlane(plane, hit);
      return hit;
    };

    const before = pointUnder();
    controls.zoomAt(ndc, 1.5);
    controls.update();
    const after = pointUnder();

    expect(after.x).toBeCloseTo(before.x, 4);
    expect(after.y).toBeCloseTo(before.y, 4);
  });

  it('gives up an animation in flight when the hand takes over', () => {
    const now = vi.spyOn(performance, 'now');
    now.mockReturnValue(0);
    const { controls } = makeControls();
    controls.flyTo(new THREE.Vector3(100, 100, 0), 500, 1);
    controls.pan(10, 0);
    now.mockReturnValue(1000);
    controls.update();
    expect(controls.target.x).toBeCloseTo(-10 * controls.worldUnitsPerPixel, 6);
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

  it('bounds orthographic zoom to the fitted frame so the canvas never empties', () => {
    const now = vi.spyOn(performance, 'now');
    now.mockReturnValue(0);
    const { controls, camera } = makeOrthoControls();
    controls.setOrthoZoomRange(1);
    expect(controls.getOrthoZoomRange()).toEqual({ min: 1 / 3, max: 2.5 });

    controls.flyTo(new THREE.Vector3(0, 0, 0), 500, 1, 0.001);
    now.mockReturnValue(1000);
    controls.update();
    expect(camera.zoom).toBeCloseTo(1 / 3, 6);

    controls.flyTo(new THREE.Vector3(0, 0, 0), 500, 1, 99);
    now.mockReturnValue(2000);
    controls.update();
    expect(camera.zoom).toBeCloseTo(2.5, 6);

    controls.setOrthoZoomRange();
    expect(controls.getOrthoZoomRange()).toBeNull();
  });

  it('cancels an in-flight zoom so an explicit value is not overwritten', () => {
    const now = vi.spyOn(performance, 'now');
    now.mockReturnValue(0);
    const { controls, camera } = makeOrthoControls();
    controls.flyTo(new THREE.Vector3(0, 0, 0), 500, 1, 2);
    controls.cancelTweens();
    camera.zoom = 8;
    now.mockReturnValue(500);
    controls.update();
    expect(camera.zoom).toBeCloseTo(8, 6);
  });
});

describe('T1.19 a target move is a pan, not a re-aim', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps the camera pose when the target moves sideways', () => {
    const { controls, camera } = makeControls();
    const before = camera.quaternion.clone();

    controls.setTarget(120, -80, 0);
    controls.update();

    // The camera moved with the target, so the view direction — and the pose — is unchanged.
    expect(camera.quaternion.angleTo(before)).toBeCloseTo(0, 6);
    expect(controls.target.x).toBeCloseTo(120, 6);
    expect(controls.target.y).toBeCloseTo(-80, 6);
  });

  it('keeps a top-down camera top-down', () => {
    const { controls, camera } = makeControls();

    controls.setTarget(400, 300, 0);
    controls.update();

    expect(controls.spherical.phi).toBeCloseTo(Math.PI / 2, 6);
    expect(controls.spherical.theta).toBeCloseTo(0, 6);
    expect(camera.position.z).toBeCloseTo(500, 6);
  });
});
