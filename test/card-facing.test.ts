// @vitest-environment jsdom
import * as THREE from 'three';
import { describe, expect, test, vi } from 'vitest';
import { HtmlNode } from '../src/nodes/HtmlNode';

// T1.19 — a DOM card that faces the camera must end up screen-aligned. The CSS3D pipeline composes
// the camera's view matrix with the node's world matrix, so the node carries the camera's rotation,
// not its inverse: the inverse turned the card twice and left it rolled and squashed.

function tiltedCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(75, 1.6, 0.1, 10000);
  camera.position.set(140, 260, 640);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  return camera;
}

function makeCard(camera: THREE.Camera, cardFacing: 'plane' | 'camera', billboard = false): HtmlNode {
  const sg = {
    events: { emit: vi.fn() },
    renderer: { camera, cardFacing },
    graph: { nodes: new Map() },
  };
  const node = new HtmlNode(sg as never, {
    id: 'card',
    type: 'HtmlNode',
    data: { html: '<div>card</div>', billboard },
  } as never);

  node.updatePosition(0, 0, 0);

  return node;
}

/** The rotation the card has on screen: the view matrix applied to the card's world rotation. */
function screenRotation(card: HtmlNode, camera: THREE.Camera): THREE.Quaternion {
  return camera.quaternion.clone().invert().multiply(card.cssObject.quaternion);
}

describe('a card that faces the camera', () => {
  test('is screen-aligned under a tilted camera', () => {
    const camera = tiltedCamera();
    const card = makeCard(camera, 'plane', true);

    expect(screenRotation(card, camera).angleTo(new THREE.Quaternion())).toBeCloseTo(0, 6);
  });

  test('is screen-aligned under a top-down camera too', () => {
    const camera = new THREE.PerspectiveCamera(75, 1.6, 0.1, 10000);
    camera.position.set(0, 0, 640);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const card = makeCard(camera, 'plane', true);

    expect(screenRotation(card, camera).angleTo(new THREE.Quaternion())).toBeCloseTo(0, 6);
  });

  test('follows the camera when the pose changes', () => {
    const camera = tiltedCamera();
    const card = makeCard(camera, 'plane', true);

    camera.position.set(-320, 480, 520);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    card.updatePosition(0, 0, 0);

    expect(screenRotation(card, camera).angleTo(new THREE.Quaternion())).toBeCloseTo(0, 6);
  });
});

describe('a card that does not face the camera', () => {
  test('stays flat on the content plane', () => {
    const camera = tiltedCamera();
    const card = makeCard(camera, 'plane');

    expect(card.cssObject.quaternion.angleTo(new THREE.Quaternion())).toBeCloseTo(0, 6);
  });

  test('faces the camera anyway when the renderer asks every card to', () => {
    const camera = tiltedCamera();
    const card = makeCard(camera, 'camera');

    expect(screenRotation(card, camera).angleTo(new THREE.Quaternion())).toBeCloseTo(0, 6);
  });
});
