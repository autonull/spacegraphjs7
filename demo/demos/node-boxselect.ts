import { createDemoWithNodes, shapeNode, SpaceGraph } from '../framework';

export default async function nodeBoxSelectDemo(): Promise<SpaceGraph> {
  const sg = await createDemoWithNodes([
        shapeNode('a', [-150, 100, 0], { color: 0xff4466, size: 40 }),
        shapeNode('b', [0, 100, 0], { color: 0x44ff88, size: 40 }),
        shapeNode('c', [150, 100, 0], { color: 0x4488ff, size: 40 }),
        shapeNode('d', [-150, -100, 0], { color: 0xffaa44, size: 40 }),
        shapeNode('e', [0, -100, 0], { color: 0xaa44ff, size: 40 }),
        shapeNode('f', [150, -100, 0], { color: 0x44aaff, size: 40 }),
    ]);

    sg.events.on('interaction:select', ({ nodes }: any) => {
        console.log(
            'Selected:',
            nodes.map((n: any) => n.id),
        );
    });

    return sg;
}
