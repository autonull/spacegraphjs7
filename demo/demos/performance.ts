import { createDemoWithNodes, SpaceGraph } from '../framework';

export default async function performanceDemo(): Promise<SpaceGraph> {
  const nodes: any[] = [];
  const edges: any[] = [];
  const count = 500;

  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `node-${i}`,
      type: 'ShapeNode',
      position: [
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * 2000,
      ],
      data: {
        shape: ['box', 'sphere', 'cone', 'cylinder'][Math.floor(Math.random() * 4)],
        color: Math.random() * 0xffffff,
      },
    });

    if (i > 0 && Math.random() > 0.7) {
      edges.push({
        id: `edge-${i}`,
        source: `node-${Math.floor(Math.random() * i)}`,
        target: `node-${i}`,
        type: 'CurvedEdge',
      });
    }
  }

  return await createDemoWithNodes(nodes, edges);
}
