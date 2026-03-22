import { SpaceGraph, GraphSpec } from 'spacegraphjs';
import { N8nWorkflowPlugin } from '../src/N8nWorkflowPlugin';

let container = document.getElementById('spacegraph-container');
if (!container) {
  container = document.createElement('div');
  container.id = 'spacegraph-container';
  container.style.width = '100vw';
  container.style.height = '100vh';
  document.body.appendChild(container);
}

// Basic load and render script
const spec: GraphSpec = {
  nodes: [
    {
      id: 'trigger',
      type: 'N8nTriggerNode',
      label: 'Webhook Trigger',
      position: [-200, 0, 0],
      parameters: { status: 'success' }
    },
    {
      id: 'http',
      type: 'N8nHttpNode',
      label: 'Send Notification',
      position: [200, 0, 0],
      parameters: { requestMethod: 'POST', url: 'https://api.slack.com/webhook' }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'http', type: 'FlowEdge' }
  ],
  layout: { type: 'ForceLayout' }
};

const sg = SpaceGraph.create(container, spec);

// Register n8n specific plugins
const n8nPlugin = new N8nWorkflowPlugin();
sg.pluginManager.register('N8nWorkflowPlugin', n8nPlugin);
