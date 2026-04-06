import { createDemoWithNodes, shapeNode, edge, htmlNode } from '../framework';

export default function fingeringDemo() {
    const sg = createDemoWithNodes(
        [
            shapeNode('node1', [-200, 0, 0], { color: 0x4488ff, size: 60 }),
            shapeNode('node2', [200, 0, 0], { color: 0xff4488, size: 60 }),
            shapeNode('node3', [0, 150, 0], { color: 0x44ff88, size: 60 }),
        ],
        [edge('node1', 'node2'), edge('node1', 'node3'), edge('node2', 'node3')],
    );

    sg.events.on('interaction:dragstart', ({ node }) => {
        console.log('Drag started:', node.id);
    });

    sg.events.on('interaction:dragend', ({ node }) => {
        console.log('Drag ended:', node.id);
    });

    sg.events.on('node:pointerenter', ({ node }) => {
        console.log('Hover:', node.id);
    });

    return sg;
}
