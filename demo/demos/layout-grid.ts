import { createDemo } from '../framework';

export default function layoutGridDemo() {
    const nodes = Array.from({ length: 12 }, (_, i) => ({
        id: `node-${i}`,
        type: 'ShapeNode',
        position: [0, 0, 0] as [number, number, number],
        data: { color: 0xff4466 + i * 0x110000 },
    }));

    return createDemo({
        nodes,
        edges: [],
        layout: {
            type: 'GridLayout',
            columns: 4,
            cellWidth: 150,
            cellHeight: 120,
            gap: 30,
        },
    });
}
