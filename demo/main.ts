import { SpaceGraph } from '../src/index';

const statusEl = document.getElementById('status')!;

function updateStatus(message: string) {
    statusEl.textContent = message;
    console.log('[Demo]', message);
}

try {
    updateStatus('Creating graph...');

    const graph = SpaceGraph.create('#container', {
        nodes: [
            {
                id: 'node-group-1',
                type: 'GroupNode',
                label: 'Cluster 1',
                position: [75, 65, -50],
                data: { width: 400, height: 300, depth: 200, color: 0x3366ff },
            },
            {
                id: 'node-a',
                type: 'ShapeNode',
                label: 'Node A',
                position: [0, 0, 0],
                data: { color: 0x3366ff },
            },
            {
                id: 'node-b',
                type: 'ShapeNode',
                label: 'Node B',
                position: [150, 0, 0],
                data: { color: 0xff6633 },
            },
            {
                id: 'node-c',
                type: 'ShapeNode',
                label: 'Node C',
                position: [75, 130, 0],
                data: { color: 0x33ff66 },
            },
            {
                id: 'node-img',
                type: 'ImageNode',
                label: 'Image Node',
                position: [75, -100, 0],
                data: {
                    url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzNjZmZiIgLz4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI2ZmZmZmZiIgLz4KICA8dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzMzNjZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U0c8L3RleHQ+Cjwvc3ZnPg==',
                },
            },
        ],
        edges: [
            {
                id: 'edge-ab',
                source: 'node-a',
                target: 'node-b',
                type: 'FlowEdge',
                data: { color: 0x00ff00, flowSpeed: 2.0 },
            },
            { id: 'edge-bc', source: 'node-b', target: 'node-c', type: 'CurvedEdge' },
            { id: 'edge-ca', source: 'node-c', target: 'node-a', type: 'Edge' },
            {
                id: 'edge-img',
                source: 'node-a',
                target: 'node-img',
                type: 'FlowEdge',
                data: { color: 0x00ffff, flowSpeed: 1.5 },
            },
        ],
    });

    updateStatus('Rendering graph...');
    graph.render();

    // Test fitView
    setTimeout(() => {
        graph.fitView(150, 2.0);
        updateStatus('✓ Graph rendered successfully! (Fit View applied)');
    }, 100);

    console.log('[Demo] Graph instance:', graph);
    console.log('[Demo] Controls: Left-click drag to rotate, scroll to zoom');

    let selectedNodeId: string | null = null;
    const originalColors: Record<string, number> = {};

    graph.events.on('node:click', ({ node }) => {
        // Reset previous selection
        if (selectedNodeId && selectedNodeId !== node.id) {
            const prevNode = graph.graph.nodes.get(selectedNodeId);
            if (prevNode) {
                prevNode.updateSpec({ data: { color: originalColors[selectedNodeId] } });
            }
        }

        if (selectedNodeId === node.id) {
            // Deselect if clicking the same node
            node.updateSpec({ data: { color: originalColors[node.id] } });
            selectedNodeId = null;
            updateStatus('✓ Graph rendered successfully! (Fit View applied)');
        } else {
            // Select new node
            if (!originalColors[node.id]) {
                originalColors[node.id] = node.data.color;
            }
            node.updateSpec({ data: { color: 0xffffff } });
            selectedNodeId = node.id;
            updateStatus(`✓ Selected node: ${node.id}`);
        }
    });

    graph.events.on('graph:click', () => {
        // Clicked on background, deselect
        if (selectedNodeId) {
            const prevNode = graph.graph.nodes.get(selectedNodeId);
            if (prevNode) {
                prevNode.updateSpec({ data: { color: originalColors[selectedNodeId] } });
            }
            selectedNodeId = null;
            updateStatus('✓ Graph rendered successfully! (Fit View applied)');
        }
    });
} catch (error) {
    const errorMsg = '✗ Error: ' + (error as Error).message;
    updateStatus(errorMsg);
    statusEl.style.color = '#f00';
    console.error('[Demo] Error:', error);
}
