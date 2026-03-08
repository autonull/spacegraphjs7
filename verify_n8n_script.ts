import { SpaceGraph } from './src';
import { N8nWorkflowPlugin } from './packages/n8n-bridge/src/N8nWorkflowPlugin';

const container = document.getElementById('spacegraph-container');
if (!container) throw new Error('Container not found');

const spec = { nodes: [], edges: [] };
const sg = SpaceGraph.create(container, spec);

// Add plugin to test prompt builder
sg.pluginManager.register('N8nWorkflowPlugin', new N8nWorkflowPlugin());
sg.pluginManager.initAll().then(() => {
    console.log("Plugins initialized");
});
