import { createDemoWithNodes, shapeNode, edge, SpaceGraph } from '../framework';

export default async function edgeFlowDemo(): Promise<SpaceGraph> {
    const nodes = [
        shapeNode('node1', [-200, 100, 0], { color: 0xff6644 }),
        shapeNode('node2', [0, 100, 0], { color: 0x44ff88 }),
        shapeNode('node3', [200, 100, 0], { color: 0x4488ff }),
        shapeNode('node4', [-200, -100, 0], { color: 0xaa44ff }),
        shapeNode('node5', [0, -100, 0], { color: 0xffaa44 }),
        shapeNode('node6', [200, -100, 0], { color: 0x44aaff }),
    ];

    const edges = [
        {
            id: 'e1',
            source: 'node1',
            target: 'node2',
            type: 'FlowEdge',
            data: { flowSpeed: 1.0, color: 0x00ff88 },
        },
        {
            id: 'e2',
            source: 'node2',
            target: 'node3',
            type: 'FlowEdge',
            data: { flowSpeed: 2.0, color: 0x00ff88 },
        },
        {
            id: 'e3',
            source: 'node4',
            target: 'node5',
            type: 'FlowEdge',
            data: { flowSpeed: 3.0, color: 0xff8800 },
        },
        {
            id: 'e4',
            source: 'node5',
            target: 'node6',
            type: 'FlowEdge',
            data: { flowSpeed: 4.0, color: 0xff8800 },
        },
        {
            id: 'e5',
            source: 'node1',
            target: 'node4',
            type: 'FlowEdge',
            data: { flowSpeed: 1.5, color: 0x8800ff },
        },
        {
            id: 'e6',
            source: 'node2',
            target: 'node5',
            type: 'FlowEdge',
            data: { flowSpeed: 2.5, color: 0x8800ff },
        },
        {
            id: 'e7',
            source: 'node3',
            target: 'node6',
            type: 'FlowEdge',
            data: { flowSpeed: 3.5, color: 0x8800ff },
        },
    ];

    return await createDemoWithNodes(nodes, edges);
}
