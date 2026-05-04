import { createDemoWithNodes, shapeNode, createDemoHint, SpaceGraph } from '../framework';

export default async function cameraPanDemo(): Promise<SpaceGraph> {
  const sg = await createDemoWithNodes([
    shapeNode('a', [-300, 0, 0], { color: 0xff4466, size: 50 }),
    shapeNode('b', [0, 0, 0], { color: 0x44ff88, size: 50 }),
    shapeNode('c', [300, 0, 0], { color: 0x4488ff, size: 50 }),
    shapeNode('d', [-300, 250, 0], { color: 0xffaa44, size: 50 }),
    shapeNode('e', [0, 250, 0], { color: 0xaa44ff, size: 50 }),
    shapeNode('f', [300, 250, 0], { color: 0x44aaff, size: 50 }),
  ]);

  createDemoHint(sg, `<strong>Pan:</strong> <kbd>Right Mouse</kbd> or <kbd>Middle Mouse</kbd> &nbsp;|&nbsp; <strong>Orbit:</strong> <kbd>Left Mouse</kbd>`);

  return sg;
}
