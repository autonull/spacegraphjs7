import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_TYPES } from '../src/core/defaults';
import { TypeRegistry, type NodeConstructor } from '../src/core/TypeRegistry';
import { DOMNode } from '../src/nodes/DOMNode';
import type { SpaceGraph } from '../src/SpaceGraph';

const sg = { options: {}, requestFrame: () => {} } as unknown as SpaceGraph;

describe('L1.15 DOMNode element spec path', () => {
  it('is registered so it can be built from a spec', () => {
    expect(DEFAULT_NODE_TYPES).toContain(DOMNode);
  });

  it('adopts a spec-supplied element through the registry', () => {
    TypeRegistry.getInstance().registerNode('DOMNode', DOMNode as unknown as NodeConstructor);
    const el = document.createElement('section');
    const node = TypeRegistry.getInstance().createNode(sg, {
      id: 'd1',
      type: 'DOMNode',
      data: { element: el },
    }) as DOMNode;
    expect(node.domElement).toBe(el);
  });

  it('never replaces a mounted element and preserves listeners across updates', () => {
    const el = document.createElement('div');
    let clicks = 0;
    el.addEventListener('click', () => (clicks += 1));
    const node = new DOMNode(sg, { id: 'd2', type: 'DOMNode', data: { element: el } });

    for (let i = 0; i < 100; i++) {
      node.updateSpec({ label: `L${i}`, data: { element: document.createElement('span') } });
    }

    expect(node.domElement).toBe(el);
    el.dispatchEvent(new Event('click'));
    expect(clicks).toBe(1);
    expect(node.label).toBe('L99');
  });
});
