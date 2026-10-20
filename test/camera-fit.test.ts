// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { calculateFitView } from '../src/utils/CameraUtils';

const nodes = (points: Array<[number, number, number]>) =>
  points.map((position) => ({ position: new THREE.Vector3(...position) }));

const orthoCamera = (aspect = 1, zoom = 1) => {
  const height = 1000;
  const width = height * aspect;
  const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 10000);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
  return camera;
};

describe('calculateFitView', () => {
  it('returns null when there are no nodes', () => {
    expect(calculateFitView([], orthoCamera())).toBeNull();
  });

  it('fits perspective by distance without a frustum zoom', () => {
    const fit = calculateFitView(nodes([[-200, 0, 0], [200, 0, 0]]), new THREE.PerspectiveCamera(75, 1, 0.1, 10000));
    expect(fit).not.toBeNull();
    expect(fit!.zoom).toBeUndefined();
    expect(fit!.cameraZ).toBeGreaterThan(200);
    expect(fit!.center.x).toBeCloseTo(0, 6);
  });

  it('fits orthographic with a frustum zoom that covers the bounds', () => {
    const broad = calculateFitView(nodes([[-500, 0, 0], [500, 0, 0]]), orthoCamera());
    const small = calculateFitView(nodes([[-50, 0, 0], [50, 0, 0]]), orthoCamera());
    expect(broad!.zoom).toBeGreaterThan(0);
    expect(small!.zoom!).toBeGreaterThan(broad!.zoom!);
  });

  it('respects the width constraint for a wide graph and the height constraint for a tall one', () => {
    const wide = calculateFitView(nodes([[0, -10, 0], [1000, 10, 0]]), orthoCamera(1));
    const tall = calculateFitView(nodes([[-10, 0, 0], [10, 1000, 0]]), orthoCamera(1));
    expect(wide!.zoom).toBeCloseTo(tall!.zoom!, 3);
  });

  it('centers on the bounding-box center', () => {
    const fit = calculateFitView(nodes([[-100, -50, 0], [300, 150, 0]]), orthoCamera());
    expect(fit!.center.x).toBeCloseTo(100, 6);
    expect(fit!.center.y).toBeCloseTo(50, 6);
  });

  it('expands the box by node extents so edge cards are not clipped', () => {
    const camera = () => new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
    const card = (x: number) => ({ position: new THREE.Vector3(x, 0, 0), data: { width: 200, height: 60 } });
    const plain = calculateFitView(nodes([[-200, 0, 0], [200, 0, 0]]), camera());
    const sized = calculateFitView([card(-200), card(200)], camera());
    expect(sized!.cameraZ).toBeGreaterThan(plain!.cameraZ);
    expect(sized!.center.x).toBeCloseTo(0, 6);
  });

  it('keeps a legible minimum zoom and starts the frame at the content corner', () => {
    const camera = orthoCamera(1);
    const fit = calculateFitView(nodes([[0, 0, 0], [4000, 100, 0]]), camera, 100, 200, undefined, 0.5);

    // The content needs a smaller zoom to fit, so the floor applies.
    expect(fit!.zoom).toBe(0.5);
    // The frame shows the content's beginning; the axis that still fits stays centred.
    expect(fit!.center.x).toBeCloseTo(0 - 100 + 1000, 6);
    expect(fit!.center.y).toBeCloseTo(50, 6);
  });

  it('frames the whole content when the floor is below the fit', () => {
    const camera = orthoCamera(1);
    const fit = calculateFitView(nodes([[-100, -50, 0], [300, 150, 0]]), camera, 100, 200, undefined, 0.05);

    expect(fit!.center.x).toBeCloseTo(100, 6);
    expect(fit!.center.y).toBeCloseTo(50, 6);
  });
});
