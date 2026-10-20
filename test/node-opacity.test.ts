// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ShapeNode } from '../src/nodes/ShapeNode';
import type { SpaceGraph } from '../src/SpaceGraph';
import type { NodeSpec } from '../src/types';

const fakeSg = () => ({ options: {} }) as unknown as SpaceGraph;

const shapeNode = (data: NodeSpec['data']) =>
  new ShapeNode(fakeSg(), { id: 'a', type: 'ShapeNode', data });

describe('node opacity', () => {
  it('applies data.opacity to the mesh material', () => {
    const node = shapeNode({ shape: 'box', opacity: 0.3 });
    expect(node.meshMaterial.opacity).toBeCloseTo(0.3);
    expect(node.meshMaterial.transparent).toBe(true);
  });

  it('defaults to fully opaque', () => {
    const node = shapeNode({});
    expect(node.meshMaterial.opacity).toBe(1);
    expect(node.meshMaterial.transparent).toBe(false);
  });

  it('updates opacity in place without replacing the material', () => {
    const node = shapeNode({});
    const material = node.meshMaterial;
    node.updateSpec({ data: { opacity: 0.5 } });
    expect(node.meshMaterial).toBe(material);
    expect(node.meshMaterial.opacity).toBeCloseTo(0.5);
    expect(node.meshMaterial.transparent).toBe(true);
  });

  it('restores full opacity when the dim clears', () => {
    const node = shapeNode({ opacity: 0.3 });
    expect(node.opacity).toBeCloseTo(0.3);
    node.updateSpec({ data: { opacity: 1 } });
    expect(node.meshMaterial.opacity).toBe(1);
    expect(node.meshMaterial.transparent).toBe(false);
  });
});
