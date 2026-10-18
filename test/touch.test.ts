import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from '../src/core/EventEmitter';
import { InputManager } from '../src/input/InputManager';
import { PinchZoomFingering } from '../src/input/fingerings';

function setup() {
  const camera = new THREE.PerspectiveCamera();
  camera.updateMatrixWorld();
  const events = new EventEmitter();
  const zoom = vi.fn();
  const pan = vi.fn();
  const sg = { renderer: { camera }, cameraControls: { zoom, pan } };
  const input = new InputManager({ sg: sg as never, events: events as never });
  input.registerFingering(new PinchZoomFingering(sg as never), 50);

  const target = document.createElement('div');
  target.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
  const send = (type: string, pointerId: number, x: number, y: number) =>
    input.handleEvent({
      type,
      source: 'canvas',
      timestamp: 0,
      consumed: false,
      originalEvent: { pointerId },
      data: { x, y, buttons: 1, target },
    } as never);
  return { send, zoom, pan };
}

describe('L1.32 two-finger touch', () => {
  it('engages multi-touch on the second pointer and zooms in on a spread (factor < 1)', () => {
    const { send, zoom } = setup();
    send('pointerdown', 1, 40, 50);
    send('pointerdown', 2, 60, 50); // distance 20
    send('pointermove', 1, 20, 50); // distance 40 (spread)
    expect(zoom).toHaveBeenCalled();
    expect(zoom.mock.calls[0][0]).toBeLessThan(1);
  });

  it('pans with the two-finger midpoint', () => {
    const { send, pan } = setup();
    send('pointerdown', 1, 40, 50);
    send('pointerdown', 2, 60, 50); // midpoint 50,50
    send('pointermove', 1, 60, 60); // midpoint 60,55
    expect(pan).toHaveBeenCalled();
    const [dx, dy] = pan.mock.calls[0];
    expect(dx).toBeGreaterThan(0);
    expect(dy).toBeGreaterThan(0);
  });

  it('stops multi-touch when a finger lifts', () => {
    const { send, zoom, pan } = setup();
    send('pointerdown', 1, 40, 50);
    send('pointerdown', 2, 60, 50);
    send('pointermove', 1, 20, 50);
    zoom.mockClear();
    pan.mockClear();
    send('pointerup', 1, 20, 50);
    send('pointermove', 2, 80, 50);
    expect(zoom).not.toHaveBeenCalled();
    expect(pan).not.toHaveBeenCalled();
  });
});
