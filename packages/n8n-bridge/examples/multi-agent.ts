import { SpaceGraph, GraphSpec } from 'spacegraphjs';

let container = document.getElementById('spacegraph-container');
if (!container) {
  container = document.createElement('div');
  container.id = 'spacegraph-container';
  container.style.width = '100vw';
  container.style.height = '100vh';
  document.body.appendChild(container);
}

// Multi-Agent Orchestration Demo with Fractal Nesting
const spec: GraphSpec = {
  nodes: [
    // --- Supervisor Agent ---
    {
      id: 'supervisor-group',
      type: 'GroupNode',
      label: 'Supervisor Agent',
      position: [0, 600, 0],
      parameters: { width: 800, height: 400, depth: 100, color: 0xaa2222 }
    },
    {
      id: 'supervisor-trigger',
      type: 'N8nTriggerNode',
      label: 'Incoming Request',
      position: [-300, 600, 0],
      parameters: { status: 'success' }
    },
    {
      id: 'supervisor-router',
      type: 'ShapeNode',
      label: 'Task Router',
      position: [0, 600, 0],
      parameters: { shape: 'diamond' }
    },

    // --- Researcher Agent ---
    {
      id: 'researcher-group',
      type: 'GroupNode',
      label: 'Researcher Agent',
      position: [-500, -200, 0],
      parameters: { width: 800, height: 400, depth: 100, color: 0x2222aa }
    },
    {
      id: 'researcher-llm',
      type: 'N8nAiNode',
      label: 'Web Search Agent',
      position: [-500, -200, 0],
      parameters: { model: 'claude-3-opus', prompt: 'Find recent news on {{ $json.topic }}' }
    },
    {
      id: 'researcher-http',
      type: 'N8nHttpNode',
      label: 'Google Search API',
      position: [-200, -200, 0],
      parameters: { requestMethod: 'GET', url: 'https://customsearch.googleapis.com' }
    },

    // --- Writer Agent ---
    {
      id: 'writer-group',
      type: 'GroupNode',
      label: 'Writer Agent',
      position: [500, -200, 0],
      parameters: { width: 800, height: 400, depth: 100, color: 0x22aa22 }
    },
    {
      id: 'writer-llm',
      type: 'N8nAiNode',
      label: 'Drafting Agent',
      position: [500, -200, 0],
      parameters: { model: 'gpt-4o', prompt: 'Write a blog post based on: {{ $json.research }}' }
    },
    {
      id: 'writer-hitl',
      type: 'N8nHitlNode',
      label: 'Editor Approval',
      position: [800, -200, 0],
      parameters: { status: 'waiting', taskSummary: 'Review draft blog post' }
    }
  ],
  edges: [
    // Internal routing
    { id: 'e1', source: 'supervisor-trigger', target: 'supervisor-router', type: 'FlowEdge' },

    // Internal researcher
    { id: 'e2', source: 'researcher-llm', target: 'researcher-http', type: 'FlowEdge' },

    // Internal writer
    { id: 'e3', source: 'writer-llm', target: 'writer-hitl', type: 'FlowEdge' },

    // Agent handoffs
    { id: 'h1', source: 'supervisor-router', target: 'researcher-llm', type: 'FlowEdge' },
    { id: 'h2', source: 'researcher-http', target: 'writer-llm', type: 'FlowEdge' }
  ],
  layout: { type: 'ForceLayout' }
};

SpaceGraph.create(container, spec);
