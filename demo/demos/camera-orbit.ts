import { createDemoWithNodes, shapeNode, createDemoHint, SpaceGraph } from '../framework';

export default async function cameraOrbitDemo(): Promise<SpaceGraph> {
  const sg = await createDemoWithNodes([
    shapeNode('center', [0, 0, 0], { color: 0x4488ff, size: 80 }),
    shapeNode('north', [0, 200, 0], { color: 0x44ff88, size: 40 }),
    shapeNode('south', [0, -200, 0], { color: 0xff4488, size: 40 }),
    shapeNode('east', [200, 0, 0], { color: 0xffaa44, size: 40 }),
    shapeNode('west', [-200, 0, 0], { color: 0xaa44ff, size: 40 }),
  ]);

  createDemoHint(sg, `<strong>Orbit:</strong> <kbd>Left Mouse</kbd> &nbsp;|&nbsp; <strong>Pan:</strong> <kbd>Right Mouse</kbd> &nbsp;|&nbsp; <strong>Zoom:</strong> <kbd>Scroll</kbd>`);

  return sg;
}
