import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DOMNode } from '../src/nodes/DOMNode';
import { Node } from '../src/nodes/Node';
import type { SpaceGraph } from '../src/SpaceGraph';
import type { NodeSpec } from '../src/types';

class TestNode extends Node {
  readonly object = new THREE.Group();
  constructor(spec: NodeSpec) {
    super(spec);
    this.object.add(new THREE.Mesh(new THREE.BoxGeometry(100, 100, 1)));
  }
}

type FakeSg = {
  options: Record<string, unknown>;
  renderer: { scene: THREE.Scene };
  requestFrame: () => void;
};

function fakeSg(): FakeSg {
  return { options: {}, renderer: { scene: new THREE.Scene() }, requestFrame: () => {} };
}

const attach = (node: Node, sg: FakeSg): FakeSg => {
  node.sg = sg as unknown as SpaceGraph;
  return sg;
};

describe('L1.11 visible mesh focus outline', () => {
  it('draws an outline on focus and hides it on blur', () => {
    const sg = fakeSg();
    const node = new TestNode({ id: 'a', type: 'TestNode', data: {} });
    attach(node, sg);

    node.focus();
    const outline = node.outlineObject;
    expect(outline).toBeDefined();
    expect(outline!.visible).toBe(true);
    expect(sg.renderer.scene.children).toContain(outline);

    node.blur();
    expect(outline!.visible).toBe(false);
  });

  it('uses the theme focus, selection, and hover colours', () => {
    const node = new TestNode({ id: 'a', type: 'TestNode', data: {} });
    attach(node, fakeSg());

    node.setControlState('selected');
    expect((node.outlineObject!.material as THREE.LineBasicMaterial).color.getHex()).toBe(0x00ff88);

    node.setControlState('hovered');
    expect((node.outlineObject!.material as THREE.LineBasicMaterial).color.getHex()).toBe(0x66aaff);

    node.focus();
    expect((node.outlineObject!.material as THREE.LineBasicMaterial).color.getHex()).toBe(0x8b5cf6);

    node.setControlState('normal');
    expect(node.outlineObject!.visible).toBe(true);
    node.blur();
    expect(node.outlineObject!.visible).toBe(false);
  });

  it('disposes the outline with the node', () => {
    const sg = fakeSg();
    const node = new TestNode({ id: 'a', type: 'TestNode', data: {} });
    attach(node, sg);
    node.focus();
    const outline = node.outlineObject!;
    node.dispose();
    expect(node.outlineObject).toBeUndefined();
    expect(sg.renderer.scene.children).not.toContain(outline);
  });
});

describe('L1.11/L1.15 DOM nodes use a DOM outline, not a mesh BoxHelper', () => {
  it('applies a DOM outline on selection and keeps no mesh outline', () => {
    const node = new DOMNode(fakeSg() as unknown as SpaceGraph, {
      id: 'd',
      type: 'DOMNode',
      data: {},
    });
    node.setControlState('selected');
    expect(node.outlineObject).toBeUndefined();
    expect(node.domElement.style.outline).toContain('solid');

    node.setControlState('normal');
    expect(node.domElement.style.outline).toBe('none');
  });
});
