import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { EventEmitter } from '../src/core/EventEmitter';
import { MinimapPlugin } from '../src/plugins/MinimapPlugin';
import { ZoomUIPlugin } from '../src/plugins/ZoomUIPlugin';
import { Renderer, WebGLRenderer } from '../src/index';

interface FakeRenderer {
  domElement: HTMLCanvasElement;
  getPixelRatio(): number;
  setViewport(): void;
  setScissor(): void;
  setScissorTest(): void;
  setClearColor(): void;
  clear(): void;
  render(): void;
}

function makeCanvas(width = 800, height = 600) {
  const el = document.createElement('canvas');
  Object.defineProperty(el, 'clientWidth', { value: width });
  Object.defineProperty(el, 'clientHeight', { value: height });
  return el;
}

function fakeSg() {
  const container = document.createElement('div');
  const domElement = makeCanvas();
  const renderer: FakeRenderer = {
    domElement,
    getPixelRatio: () => 1,
    setViewport: () => {},
    setScissor: () => {},
    setScissorTest: () => {},
    setClearColor: () => {},
    clear: () => {},
    render: () => {},
  };
  const sg = {
    container,
    renderer: {
      container,
      renderer,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(75, 4 / 3, 0.1, 10000),
    },
    cameraControls: {
      target: new THREE.Vector3(),
      enabled: true,
      setTarget: () => {},
    },
    events: new EventEmitter(),
    graph: { nodes: new Map<string, unknown>(), edges: new Map<string, unknown>() },
    requestFrame: () => {},
  };
  return sg;
}

describe('L1.33 renderer rename', () => {
  it('exposes WebGLRenderer with Renderer kept as the same deprecated alias', () => {
    expect(Renderer).toBe(WebGLRenderer);
  });
});

describe('L1.27 MinimapPlugin embedding', () => {
  it('scopes the overlay to the container, honours enable/disable, and cleans up on dispose', () => {
    const sg = fakeSg();
    const plugin = new MinimapPlugin();
    plugin.init(sg as never, sg.graph as never, sg.events as never);

    plugin.onPostRender(1);
    const overlay = sg.renderer.container.querySelector('div');
    expect(overlay).not.toBeNull();

    plugin.setEnabled(false);
    expect((overlay as HTMLElement).style.display).toBe('none');
    plugin.setEnabled(true);
    expect((overlay as HTMLElement).style.display).toBe('');

    plugin.dispose();
    expect(sg.renderer.container.querySelector('div')).toBeNull();
    expect(() => plugin.onPostRender(1)).not.toThrow();
  });

  it('does no scene work while disabled', () => {
    const sg = fakeSg();
    let renders = 0;
    (sg.renderer.renderer as { render: () => void }).render = () => renders++;
    const plugin = new MinimapPlugin();
    plugin.settings.enabled = false;
    plugin.init(sg as never, sg.graph as never, sg.events as never);
    for (let i = 0; i < 10; i++) plugin.onPostRender(1);
    expect(renders).toBe(0);
  });
});

describe('L1.27 ZoomUIPlugin embedding', () => {
  it('scopes overlays to the container and releases its listener on dispose', () => {
    const sg = fakeSg();
    const plugin = new ZoomUIPlugin({ showHint: false });
    plugin.init(sg as never, sg.graph as never, sg.events as never);

    const indicator = sg.container.querySelector('.fractal-level-indicator');
    expect(indicator).not.toBeNull();
    expect(indicator?.parentElement).toBe(sg.container);

    plugin.dispose();
    expect(sg.container.querySelector('.fractal-level-indicator')).toBeNull();
    expect(() => sg.events.emit('fractal:level-change', { to: 2, label: 'Detail' })).not.toThrow();
  });
});
