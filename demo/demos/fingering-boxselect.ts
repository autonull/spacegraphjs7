import { createDemo, SpaceGraph } from '../framework';

export default async function fingeringBoxselectDemo(): Promise<SpaceGraph> {
    const nodes = Array.from({ length: 20 }, (_, i) => ({
        id: `node-${i}`,
        type: 'ShapeNode',
        position: [((i % 5) - 2) * 120, (Math.floor(i / 5) - 1.5) * 100, 0] as [
            number,
            number,
            number,
        ],
        data: { color: 0xff4466 + i * 0x101010 },
    }));

    return await createDemo({ nodes, edges: [] });
}
