import { SpaceGraph, GraphSpec } from 'spacegraphjs';

const container = document.getElementById('spacegraph-container');
if (!container) throw new Error('Container not found');

const spec: GraphSpec = {
  nodes: [
    {
      id: 'input',
      type: 'N8nTriggerNode',
      position: [-600, 0, 0],
      parameters: { trafficCount: 15 }
    },
    {
      id: 'embedder',
      type: 'N8nAiNode',
      position: [-300, 0, 0],
      parameters: { model: 'text-embedding-3-small', prompt: 'Embed the input query.' }
    },
    {
      id: 'vector-store',
      type: 'ChartNode',
      position: [0, 200, 0],
      parameters: {
        chartType: 'bar',
        chartData: {
          labels: ['Documents', 'Embeddings', 'Chunks'],
          datasets: [{ data: [120, 1500, 3200], backgroundColor: '#4caf50' }]
        }
      }
    },
    {
      id: 'retriever',
      type: 'N8nCodeNode',
      position: [0, -200, 0],
      parameters: { jsCode: 'return db.similaritySearch(items[0].embedding, k=5);' }
    },
    {
      id: 'llm',
      type: 'N8nAiNode',
      position: [300, 0, 0],
      parameters: { model: 'gpt-4o', prompt: 'Use the retrieved context to answer the user query.' }
    },
    {
      id: 'output',
      type: 'N8nHttpNode',
      position: [600, 0, 0],
      parameters: { requestMethod: 'POST', url: 'https://api.mycompany.com/webhook/reply' }
    }
  ],
  edges: [
    { id: 'e1', source: 'input', target: 'embedder', type: 'FlowEdge' },
    { id: 'e2', source: 'embedder', target: 'vector-store', type: 'DottedEdge' },
    { id: 'e3', source: 'vector-store', target: 'retriever', type: 'DottedEdge' },
    { id: 'e4', source: 'embedder', target: 'retriever', type: 'FlowEdge' },
    { id: 'e5', source: 'retriever', target: 'llm', type: 'FlowEdge' },
    { id: 'e6', source: 'llm', target: 'output', type: 'FlowEdge' }
  ],
  layout: { type: 'HierarchicalLayout', direction: 'LR' }
};

SpaceGraph.create(container, spec);