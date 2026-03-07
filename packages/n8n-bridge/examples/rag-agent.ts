import { SpaceGraph, GraphSpec } from 'spacegraphjs';

let container = document.getElementById('spacegraph-container');
if (!container) {
  container = document.createElement('div');
  container.id = 'spacegraph-container';
  container.style.width = '100vw';
  container.style.height = '100vh';
  document.body.appendChild(container);
}

// Template: Input -> Embedder -> VectorStore -> Retriever -> LLM -> Output
const spec: GraphSpec = {
  nodes: [
    {
      id: 'input',
      type: 'N8nTriggerNode',
      label: 'Input/Webhook',
      position: [-600, 0, 0],
      parameters: { status: 'success' }
    },
    {
      id: 'embedder',
      type: 'N8nHttpNode',
      label: 'Embeddings (OpenAI)',
      position: [-300, 150, 0],
      parameters: { requestMethod: 'POST', url: 'https://api.openai.com/v1/embeddings' }
    },
    {
      id: 'vectorstore',
      type: 'ChartNode',
      label: 'Pinecone Vector Store',
      position: [0, 300, 0],
      parameters: {
         chartType: 'bar',
         data: {
             labels: ['Indexes', 'Vectors'],
             datasets: [{ data: [1, 15042] }]
         }
      }
    },
    {
      id: 'retriever',
      type: 'N8nCodeNode',
      label: 'Retriever Logic',
      position: [0, -150, 0],
      parameters: { jsCode: 'return items.map(i => ({...i, query: i.json.text}));' }
    },
    {
      id: 'llm',
      type: 'N8nAiNode',
      label: 'LLM (GPT-4)',
      position: [300, 0, 0],
      parameters: { model: 'gpt-4', prompt: 'Answer based on context: {{ $json.context }}' }
    },
    {
      id: 'output',
      type: 'DataNode',
      label: 'Output/Response',
      position: [600, 0, 0],
      parameters: { data: { result: 'Generated answer' } }
    }
  ],
  edges: [
    { id: 'e1', source: 'input', target: 'embedder', type: 'FlowEdge' },
    { id: 'e2', source: 'embedder', target: 'vectorstore', type: 'FlowEdge' },
    { id: 'e3', source: 'input', target: 'retriever', type: 'FlowEdge' },
    { id: 'e4', source: 'retriever', target: 'vectorstore', type: 'DottedEdge' },
    { id: 'e5', source: 'vectorstore', target: 'llm', type: 'FlowEdge' },
    { id: 'e6', source: 'retriever', target: 'llm', type: 'FlowEdge' },
    { id: 'e7', source: 'llm', target: 'output', type: 'FlowEdge' }
  ],
  layout: { type: 'HierarchicalLayout', direction: 'LR' }
};

SpaceGraph.create(container, spec);
