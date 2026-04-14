import { createDemo } from '../framework';

export default function layoutCircularDemo() {
    const nodes = Array.from({ length: 10 }, (_, i) => ({
        id: `node-${i}`,
        type: 'ShapeNode',
        position: [0, 0, 0] as [number, number, number],
        data: { color: 0xff4466 + i * 0x110011 },
    }));

    const edges = Array.from({ length: 10 }, (_, i) => ({
        id: `edge-${i}`,
        source: `node-${i}`,
        target: `node-${(i + 1) % 10}`,
        type: 'Edge',
    }));

    return createDemo({
        nodes,
        edges,
        layout: {
            type: 'CircularLayout',
            radius: 200,
            startAngle: 0,
            clockwise: true,
        },
    });
}
