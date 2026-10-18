import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CameraControls } from '../src/core/CameraControls';
import { Node, type VisibilityContext } from '../src/nodes/Node';
import { HierarchicalLayout } from '../src/plugins/layouts/HierarchicalLayout';
import type { NodeData, NodeSpec } from '../src/types';

class TestNode extends Node {
  readonly object = new THREE.Group();
}

function makeNode(id: string, spec: Partial<NodeSpec> = {}): TestNode {
  const node = new TestNode({ id, type: 'TestNode', data: {}, ...spec } as NodeSpec);
  node.object.add(new THREE.Mesh(new THREE.BoxGeometry(100, 100, 1)));
  return node;
}

function makeContext(cameraPosition = new THREE.Vector3(0, 0, 0)): VisibilityContext {
  return {
    cameraFrustum: new THREE.Frustum(),
    viewportBounds: { width: 800, height: 600 },
    minPixelSize: 0.5,
    cameraPosition,
  };
}

function fakeSg(zoom: number | undefined) {
  return { renderer: { getZoom: () => zoom } } as unknown as Node['sg'];
}

describe('L1.14 per-node LOD', () => {
  it('honours per-node zoom bands', () => {
    const node = makeNode('a');
    node.sg = fakeSg(0.2);
    Object.assign(node.data, { minZoom: 0.4, maxZoom: 0.9 });
    expect(node.computeLOD(makeContext())).toBe('hidden');
    node.sg = fakeSg(0.5);
    expect(node.computeLOD(makeContext())).toBe('high');
    node.sg = fakeSg(0.95);
    expect(node.computeLOD(makeContext())).toBe('hidden');
  });

  it('honours an explicit data.lod override', () => {
    const node = makeNode('a');
    node.sg = fakeSg(0.5);
    Object.assign(node.data, { lod: 'low' });
    expect(node.computeLOD(makeContext())).toBe('low');
  });

  it('reports hidden for an invisible node', () => {
    const node = makeNode('a');
    node.sg = fakeSg(0.5);
    node.visible = false;
    expect(node.computeLOD(makeContext())).toBe('hidden');
  });

  it('degrades to hidden when the node is too small on screen', () => {
    const node = makeNode('a');
    node.sg = fakeSg(0.5);
    const ctx = makeContext();
    ctx.cameraPosition = new THREE.Vector3(0, 0, 0);
    expect(node.computeLOD(ctx)).not.toBe('hidden');
    ctx.viewportBounds = { width: 200_000, height: 200_000 };
    expect(node.computeLOD(ctx)).toBe('hidden');
  });

  it('recaches bounds when the render frame token advances', () => {
    const node = makeNode('a');
    const before = node.getScreenPixelSize({ width: 800, height: 600 });
    node.object.scale.setScalar(2);
    Node.lodFrame++;
    const after = node.getScreenPixelSize({ width: 800, height: 600 });
    expect(after).toBeCloseTo(before * 2, 4);
  });
});

describe('L1.6 container-scoped keyboard', () => {
  const makeControls = (keyboard: false | 'container' | 'window') => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000);
    camera.position.set(0, 0, 500);
    const controls = new CameraControls(camera, container, { keyboard });
    return { controls, camera, container };
  };

  it('moves the camera for keys on the container when scoped to the container', () => {
    const { controls, camera, container } = makeControls('container');
    controls.update();
    const start = camera.position.clone();
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    controls.update();
    controls.update();
    expect(camera.position.distanceTo(start)).toBeGreaterThan(0);
  });

  it('ignores keys dispatched to the window when scoped to the container', () => {
    const { controls, camera } = makeControls('container');
    controls.update();
    const start = camera.position.clone();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    controls.update();
    controls.update();
    expect(camera.position.distanceTo(start)).toBeCloseTo(0, 6);
  });

  it('ignores keys typed into an editable element inside the container', () => {
    const { controls, camera, container } = makeControls('container');
    const input = document.createElement('input');
    container.appendChild(input);
    controls.update();
    const start = camera.position.clone();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
    controls.update();
    controls.update();
    expect(camera.position.distanceTo(start)).toBeCloseTo(0, 6);
  });

  it('binds no keyboard when scope is false', () => {
    const { controls, camera, container } = makeControls(false);
    controls.update();
    const start = camera.position.clone();
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    controls.update();
    controls.update();
    expect(camera.position.distanceTo(start)).toBeCloseTo(0, 6);
  });

  it('listens on the window when scoped to the window', () => {
    const { controls, camera } = makeControls('window');
    controls.update();
    const start = camera.position.clone();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    controls.update();
    controls.update();
    expect(camera.position.distanceTo(start)).toBeGreaterThan(0);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
  });
});

describe('L1.16 deterministic layouts', () => {
  const makeGraph = (ids: string[]) => {
    const nodes = new Map<string, any>();
    for (const id of ids) {
      nodes.set(id, {
        id,
        type: 'test',
        data: {} as NodeData,
        position: new THREE.Vector3(),
        object: { position: new THREE.Vector3() },
      });
    }
    return {
      nodes,
      edges: new Map(),
      getNodes: () => nodes.values(),
      getEdges: () => [] as any[],
    };
  };

  const initLayout = (layout: HierarchicalLayout, graph: any) => {
    layout.init({ requestFrame: () => {} } as any, graph as any, { emit: () => {} } as any);
  };

  it('produces identical positions across repeated runs', async () => {
    const graph = makeGraph(['a', 'b', 'c', 'd']);
    const layout = new HierarchicalLayout();
    initLayout(layout, graph);
    await layout.apply();
    const first = [...graph.nodes.values()].map((n) => n.position.clone());
    await layout.apply();
    const second = [...graph.nodes.values()].map((n) => n.position.clone());
    first.forEach((p, i) => expect(second[i].equals(p)).toBe(true));
  });

  it('never moves pinned nodes when new nodes are added', async () => {
    const graph = makeGraph(['a', 'b', 'c']);
    const pinned = graph.nodes.get('a');
    pinned.data.pinned = true;
    pinned.position.set(5, 5, 5);
    const layout = new HierarchicalLayout();
    initLayout(layout, graph);
    await layout.apply();
    expect(pinned.position.equals(new THREE.Vector3(5, 5, 5))).toBe(true);

    graph.nodes.set('d', {
      id: 'd',
      type: 'test',
      data: {} as NodeData,
      position: new THREE.Vector3(),
      object: { position: new THREE.Vector3() },
    });
    await layout.apply();
    expect(pinned.position.equals(new THREE.Vector3(5, 5, 5))).toBe(true);
  });
});
