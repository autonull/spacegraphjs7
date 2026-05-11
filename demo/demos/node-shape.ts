import { createDemoWithNodes, shapeNode, edge, SpaceGraph } from '../framework';

const SHAPES = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'circle', 'ring'];

export default async function nodeShapeDemo(): Promise<SpaceGraph> {
    const nodes = SHAPES.map((shape, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        return shapeNode(`shape-${i}`, [col * 200 - 300, row * 150 - 75, 0], {
            shape,
            color: 0x4488ff + i * 0x101010,
            scale: 1.5,
        });
    });

    return await createDemoWithNodes(nodes, []);
}
