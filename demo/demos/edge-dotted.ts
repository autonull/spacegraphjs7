import { createDemoWithNodes, shapeNode, edge } from '../framework';

export default function edgeDottedDemo() {
    const nodes = [
        shapeNode('a', [-200, 100, 0], { color: 0xff6644 }),
        shapeNode('b', [0, 100, 0], { color: 0x44ff88 }),
        shapeNode('c', [200, 100, 0], { color: 0x4488ff }),
        shapeNode('d', [-200, -100, 0], { color: 0xaa44ff }),
        shapeNode('e', [0, -100, 0], { color: 0xffaa44 }),
        shapeNode('f', [200, -100, 0], { color: 0x44aaff }),
    ];

    const edges = [
        {
            id: 'e1',
            source: 'a',
            target: 'b',
            type: 'DottedEdge',
            data: { dashSize: 10, gapSize: 8, color: 0x888888 },
        },
        {
            id: 'e2',
            source: 'b',
            target: 'c',
            type: 'DottedEdge',
            data: { dashSize: 5, gapSize: 5, color: 0xff0000 },
        },
        {
            id: 'e3',
            source: 'd',
            target: 'e',
            type: 'DottedEdge',
            data: { dashSize: 3, gapSize: 10, color: 0x00ff00 },
        },
        {
            id: 'e4',
            source: 'e',
            target: 'f',
            type: 'DottedEdge',
            data: { dashSize: 15, gapSize: 3, color: 0x0000ff },
        },
        {
            id: 'e5',
            source: 'a',
            target: 'd',
            type: 'DottedEdge',
            data: { dashSize: 8, gapSize: 6, color: 0xff8800 },
        },
        {
            id: 'e6',
            source: 'b',
            target: 'e',
            type: 'DottedEdge',
            data: { dashSize: 8, gapSize: 6, color: 0xff8800 },
        },
        {
            id: 'e7',
            source: 'c',
            target: 'f',
            type: 'DottedEdge',
            data: { dashSize: 8, gapSize: 6, color: 0xff8800 },
        },
    ];

    return createDemoWithNodes(nodes, edges);
}
