import { SpaceGraph, GraphSpec } from '../src';
import { N8nWorkflowPlugin } from '../packages/n8n-bridge/src/N8nWorkflowPlugin';

const container = document.getElementById('spacegraph-container');
if (!container) throw new Error('Container not found');

const spec: GraphSpec = {
  nodes: [
    {
      id: 'trigger',
      type: 'N8nTriggerNode',
      position: [-400, 0, 0],
      parameters: { status: 'running' }
    },
    {
      id: 'schedule',
      type: 'N8nScheduleNode',
      position: [-100, 200, 0],
      parameters: { cronExpression: '0 * * * *', nextRun: 'in 30 mins' }
    },
    {
      id: 'http',
      type: 'N8nHttpNode',
      position: [-100, -200, 0],
      parameters: { requestMethod: 'POST', url: 'https://api.myapp.com/data' }
    },
    {
      id: 'ai',
      type: 'N8nAiNode',
      position: [200, 0, 0],
      parameters: { model: 'gpt-4o', prompt: 'Summarize the given text.' }
    },
    {
      id: 'code',
      type: 'N8nCodeNode',
      position: [500, 200, 0],
      parameters: { jsCode: 'const x = 10;\nreturn items.map(i => ({...i, x}));' }
    },
    {
      id: 'cred',
      type: 'N8nCredentialNode',
      position: [500, -200, 0],
      parameters: { service: 'OpenAI API', apiKey: 'sk-12345' }
    },
    {
      id: 'hitl',
      type: 'N8nHitlNode',
      position: [800, 0, 0],
      parameters: { status: 'waiting', taskSummary: 'Review generated response' }
    },
    {
      id: 'vision',
      type: 'N8nVisionOptimizerNode',
      position: [1100, 0, 0],
      parameters: { score: 65 }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'ai', type: 'FlowEdge' },
    { id: 'e2', source: 'schedule', target: 'ai', type: 'FlowEdge' },
    { id: 'e3', source: 'http', target: 'ai', type: 'FlowEdge' },
    { id: 'e4', source: 'ai', target: 'code', type: 'FlowEdge' },
    { id: 'e5', source: 'ai', target: 'cred', type: 'DottedEdge' },
    { id: 'e6', source: 'code', target: 'hitl', type: 'FlowEdge' },
    { id: 'e7', source: 'hitl', target: 'vision', type: 'FlowEdge' }
  ],
  layout: { type: 'ForceLayout' }
};

const sg = new SpaceGraph(container);
sg.init().then(() => {
    const plugin = new N8nWorkflowPlugin();
    sg.pluginManager.register('n8n', plugin);
    plugin.init(sg);
    sg.loadSpec(spec);
    sg.render();
});
