import { createDemoWithNodes, shapeNode } from '../framework';

export default async function interactiveDemo() {
  const nodes = [
    shapeNode('draggable', [-150, 0, 0], { color: 0x4488ff, size: 60 }),
    shapeNode('target1', [100, -100, 0], { color: 0x44ff88, size: 50 }),
    shapeNode('target2', [100, 100, 0], { color: 0xff4488, size: 50 }),
  ];

  const sg = await createDemoWithNodes(nodes);

    const el = document.createElement('div');
    el.style.cssText =
        'position:fixed;top:20px;left:20px;z-index:100;color:#fff;font-size:14px;background:rgba(0,0,0,0.7);padding:10px;border-radius:4px;';
    el.innerHTML = `
        <strong>Interaction Demo</strong><br>
        • Left drag node = move<br>
        • Left drag empty = orbit<br>
        • Middle drag = pan<br>
        • Right drag = zoom<br>
        • Shift+drag = box select<br>
        • Alt+drag = create edge<br>
    `;
    document.body.appendChild(el);

    sg.events.on('interaction:dragstart', ({ node }: any) => {
        console.log('Drag started:', node.id);
    });

    sg.events.on('connection:complete', ({ source, target }: any) => {
        console.log('Edge created:', source.id, '->', target.id);
    });

    return sg;
}
