import { createDemoWithNodes, shapeNode, edge } from '../framework';

export default function edgeCurvedDemo() {
    const nodes = [
        shapeNode('start', [-300, 0, 0], { color: 0xff6644 }),
        shapeNode('mid1', [-100, 100, 0], { color: 0x44ff88 }),
        shapeNode('mid2', [100, -100, 0], { color: 0x4488ff }),
        shapeNode('end', [300, 0, 0], { color: 0xaa44ff }),
    ];

    const edges = [
        edge('start', 'mid1', 'CurvedEdge'),
        edge('mid1', 'mid2', 'CurvedEdge'),
        edge('mid2', 'end', 'CurvedEdge'),
        edge('start', 'mid2', 'CurvedEdge'),
    ];

    return createDemoWithNodes(nodes, edges);
}
