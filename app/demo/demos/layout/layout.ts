import { createDemoWithNodes, type SpaceGraph, shapeNode } from '../../framework';

export default async function layoutDemo(): Promise<SpaceGraph> {
    const nodes: any[] = [];
    for (let i = 0; i < 12; i++) {
        nodes.push(shapeNode(`n${i}`, [0, 0, 0], { color: Math.random() * 0xffffff, size: 40 }));
    }

    return await createDemoWithNodes(nodes);
}
