import { createDemoWithNodes, shapeNode, createDemoHint, SpaceGraph } from '../framework';

export default async function cameraZoomDemo(): Promise<SpaceGraph> {
  const sg = await createDemoWithNodes([
    shapeNode('close', [0, 0, 0], { color: 0xff4466, size: 100 }),
    shapeNode('mid', [0, 250, 0], { color: 0x44ff88, size: 60 }),
    shapeNode('far', [0, 450, 0], { color: 0x4488ff, size: 30 }),
  ]);

  createDemoHint(sg, `<strong>Zoom:</strong> <kbd>Scroll Wheel</kbd> &nbsp;|&nbsp; <strong>Orbit:</strong> <kbd>Left Mouse</kbd> &nbsp;|&nbsp; <strong>Pan:</strong> <kbd>Right Mouse</kbd>`);

  return sg;
}
