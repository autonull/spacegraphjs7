import { createDemoWithNodes, shapeNode, edge } from '../framework';

export default async function nodeWiringDemo() {
  const sg = await createDemoWithNodes([
        shapeNode('source', [-200, 0, 0], { color: 0x44ff88, size: 50 }),
        shapeNode('target1', [200, -100, 0], { color: 0xff4466, size: 40 }),
        shapeNode('target2', [200, 100, 0], { color: 0x4488ff, size: 40 }),
    ]);

    sg.events.on('connection:complete', ({ source, target }: any) => {
        console.log('Connected:', source.id, '->', target.id);
    });

    return sg;
}
