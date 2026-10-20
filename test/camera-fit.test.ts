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

describe('calculateFitView with screen-space insets', () => {
  const surface = { width: 1000, height: 1000 };
  const content = nodes([[-500, 0, 0], [500, 0, 0]]);

  it('frames the content inside the region the insets leave free', () => {
    const camera = orthoCamera(1);
    const plain = calculateFitView(content, camera, 100, 200, undefined, undefined, surface);
    const inset = calculateFitView(content, camera, 100, 200, undefined, undefined, surface, {
      top: 0,
      right: 200,
      bottom: 0,
      left: 0,
    });

    // The content is 1000 units wide and the margin 200, so the plain fit zooms to 1000/1200.
    expect(plain!.zoom).toBeCloseTo(1000 / 1200, 6);
    // The region is 800 wide, so the content has to shrink into it.
    expect(inset!.zoom).toBeCloseTo((1000 * 800) / (1200 * 1000), 6);
    expect(inset!.zoom!).toBeLessThan(plain!.zoom!);
  });

  it('centres the content in the region, not on the surface', () => {
    const camera = orthoCamera(1);
    const fit = calculateFitView(content, camera, 100, 200, undefined, undefined, surface, {
      top: 0,
      right: 200,
      bottom: 0,
      left: 0,
    });

    // The region runs from 0 to 800 CSS pixels, so the content's centre lands on 400 of them. The
    // camera centre is the world point that maps there: 400 = (0 - center) * 0.667 + 500.
    const pxPerWorld = (surface.height * fit!.zoom!) / 1000;
    expect(fit!.center.x).toBeCloseTo((500 - 400) / pxPerWorld, 6);
  });

  it('moves the frame down when the top carries an inset', () => {
    const camera = orthoCamera(1);
    const fit = calculateFitView(content, camera, 100, 200, undefined, undefined, surface, {
      top: 100,
      right: 0,
      bottom: 0,
      left: 0,
    });

    // The region runs from 100 to 1000 CSS pixels, so the content's centre lands on 550 of them.
    const pxPerWorld = (surface.height * fit!.zoom!) / 1000;
    expect(fit!.center.y).toBeCloseTo((550 - 500) / pxPerWorld, 6);
  });

  it('anchors the floor at the region corner, so the reader pans forward inside it', () => {
    const camera = orthoCamera(1);
    const fit = calculateFitView(content, camera, 100, 200, undefined, 0.9, surface, {
      top: 0,
      right: 200,
      bottom: 0,
      left: 0,
    });

    // The floor applies, so the frame starts at the content's first corner inside the region.
    expect(fit!.zoom).toBe(0.9);
    const pxPerWorld = (surface.height * fit!.zoom!) / 1000;
    const visibleWidth = (surface.width - 200) / pxPerWorld;
    const offsetX = (0 - 200) / 2 / pxPerWorld;
    // The region's left edge in world units, where the content's first corner has to land.
    expect(fit!.center.x + offsetX - visibleWidth / 2).toBeCloseTo(-500 - 100, 6);
  });

  it('ignores the insets without a surface to measure them against', () => {
    const camera = orthoCamera(1);
    const withSurface = calculateFitView(content, camera, 100, 200, undefined, undefined, surface);
    const withoutSurface = calculateFitView(content, camera, 100, 200, undefined, undefined, undefined, {
      top: 0,
      right: 200,
      bottom: 0,
      left: 0,
    });

    expect(withoutSurface!.zoom).toBeCloseTo(withSurface!.zoom!, 6);
    expect(withoutSurface!.center.x).toBeCloseTo(withSurface!.center.x, 6);
  });

  it('steps a perspective camera back so the content fits the region', () => {
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
    const plain = calculateFitView(content, camera, 100, 200, undefined, undefined, surface);
    const inset = calculateFitView(content, camera, 100, 200, undefined, undefined, surface, {
      top: 0,
      right: 200,
      bottom: 0,
      left: 0,
    });

    expect(inset!.cameraZ).toBeGreaterThan(plain!.cameraZ);
  });
});
