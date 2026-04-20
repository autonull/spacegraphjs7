import { createDemo } from '../framework';

export default async function layoutForceDemo() {
    const nodes = Array.from({ length: 20 }, (_, i) => ({
        id: `node-${i}`,
        type: 'ShapeNode',
        position: [(Math.random() - 0.5) * 400, (Math.random() - 0.5) * 300, 0] as [
            number,
            number,
            number,
        ],
        data: { color: 0xff4466 + i * 0x101010 },
    }));

    const edges = Array.from({ length: 25 }, (_, i) => ({
        id: `edge-${i}`,
        source: `node-${Math.floor(Math.random() * 20)}`,
        target: `node-${Math.floor(Math.random() * 20)}`,
        type: 'Edge',
    }));

    return await createDemo({
        nodes,
        edges,
        layout: {
            type: 'ForceLayout',
            strength: 0.5,
            distance: 150,
            iterations: 200,
        },
    });
}
