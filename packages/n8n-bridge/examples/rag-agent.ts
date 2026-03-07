import { SpaceGraph, GraphSpec } from 'spacegraphjs';

const container = document.getElementById('spacegraph-container');
if (!container) throw new Error('Container not found');

const spec: GraphSpec = {
  nodes: [
    {
      id: 'http-input',
      type: 'N8nHttpNode',
      position: [-400, 0, 0],
      parameters: { requestMethod: 'GET', url: 'https://docs.mycompany.com/api/data' }
    },
    {
      id: 'vector-store',
      type: 'ChartNode',
      position: [0, -300, 0],
      parameters: {
        chartType: 'bar',
        chartData: {
          labels: ['Documents', 'Embeddings', 'Chunks'],
          datasets: [{ data: [120, 1500, 3200], backgroundColor: '#4caf50' }]
        }
      }
    },
    {
      id: 'ai-agent',
      type: 'N8nAiNode',
      position: [0, 0, 0],
      parameters: { model: 'gpt-4o', prompt: 'Use the retrieved documents to answer the user query.' }
    },
    {
      id: 'webhook-output',
      type: 'N8nTriggerNode',
      position: [400, 0, 0],
      parameters: { status: 'waiting' }
    }
  ],
  edges: [
    { id: 'e1', source: 'http-input', target: 'ai-agent', type: 'FlowEdge' },
    { id: 'e2', source: 'ai-agent', target: 'vector-store', type: 'DottedEdge' },
    { id: 'e3', source: 'ai-agent', target: 'webhook-output', type: 'FlowEdge' }
  ],
  layout: { type: 'ForceLayout' }
};

SpaceGraph.create(container, spec);