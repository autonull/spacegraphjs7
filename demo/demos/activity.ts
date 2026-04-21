import { createDemoWithNodes, shapeNode, addOverlayPanel, SpaceGraph } from '../framework';

export default async function activityDemo(): Promise<SpaceGraph> {
  const nodes = [];
  for (let i = 0; i < 5; i++) {
    nodes.push(shapeNode(`n${i}`, [i * 120 - 240, 0, 0], { color: 0x3366ff, size: 50 }));
  }

  const sg = await createDemoWithNodes(nodes);

  addOverlayPanel(sg, 'bottom-left', { fontSize: '14px' }, 'Click nodes to pulse activity');

  sg.events.on('node:click', ({ node }: any) => {
    node.pulse(1.0);
    console.log('Pulsed:', node.id, 'activity:', node.activity);
  });

  return sg;
}
