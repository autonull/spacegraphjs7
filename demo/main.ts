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
        id: 'node-a',
        type: 'ShapeNode',
        label: 'Node A',
        position: [0, 0, 0],
        data: { color: 0x3366ff }
      },
      {
        id: 'node-b',
        type: 'ShapeNode',
        label: 'Node B',
        position: [150, 0, 0],
        data: { color: 0xff6633 }
      },
      {
        id: 'node-c',
        type: 'ShapeNode',
        label: 'Node C',
        position: [75, 130, 0],
        data: { color: 0x33ff66 }
      }
    ],
    edges: [
      { id: 'edge-ab', source: 'node-a', target: 'node-b', type: 'Edge' },
      { id: 'edge-bc', source: 'node-b', target: 'node-c', type: 'Edge' },
      { id: 'edge-ca', source: 'node-c', target: 'node-a', type: 'Edge' }
    ]
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

} catch (error) {
  const errorMsg = '✗ Error: ' + (error as Error).message;
  updateStatus(errorMsg);
  statusEl.style.color = '#f00';
  console.error('[Demo] Error:', error);
}