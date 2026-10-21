import { createDemo, createDemoHint, type SpaceGraph } from '../framework';

export default async function cameraOrthoDemo(): Promise<SpaceGraph> {
  const sg = await createDemo({
    nodes: [
      {
        id: 'a',
        type: 'ShapeNode',
        position: [-100, 100, 0],
        data: { color: 0xff4466, size: 40 },
      },
      {
        id: 'b',
        type: 'ShapeNode',
        position: [100, 100, 0],
        data: { color: 0x44ff88, size: 40 },
      },
      {
        id: 'c',
        type: 'ShapeNode',
        position: [0, -100, 0],
        data: { color: 0x4488ff, size: 40 },
      },
    ],
    edges: [],
  });

  createDemoHint(
    sg,
    `<strong>Pan:</strong> <kbd>Right Mouse</kbd> &nbsp;|&nbsp; <strong>Zoom:</strong> <kbd>Scroll</kbd> &nbsp;|&nbsp; <strong>Frame a node:</strong> <kbd>Middle Click</kbd>`
  );

  return sg;
}
