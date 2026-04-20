import { createDemoWithNodes, shapeNode, edge } from '../framework';

export default async function basicDemo() {
  return await createDemoWithNodes(
        [
            shapeNode('a', [-150, 50, 0], { color: 0xff4466 }),
            shapeNode('b', [0, 50, 0], { color: 0x44ff88 }),
            shapeNode('c', [150, 50, 0], { color: 0x4488ff }),
            shapeNode('d', [-75, -100, 0], { color: 0xffaa44 }),
            shapeNode('e', [75, -100, 0], { color: 0xaa44ff }),
        ],
        [edge('a', 'b'), edge('b', 'c'), edge('a', 'd'), edge('d', 'e'), edge('e', 'c')],
    );
}
