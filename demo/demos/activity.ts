import { createDemoWithNodes, shapeNode } from '../framework';

export default async function activityDemo() {
  const nodes = [];
  for (let i = 0; i < 5; i++) {
    nodes.push(shapeNode(`n${i}`, [i * 120 - 240, 0, 0], { color: 0x3366ff, size: 50 }));
  }

  const sg = await createDemoWithNodes(nodes);

    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:20px;left:20px;z-index:100;color:#fff;font-size:14px;';
    el.innerHTML = 'Click nodes to pulse activity';
    document.body.appendChild(el);

    sg.events.on('node:click', ({ node }: any) => {
        node.pulse(1.0);
        console.log('Pulsed:', node.id, 'activity:', node.activity);
    });

    return sg;
}
