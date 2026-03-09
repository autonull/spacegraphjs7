import { SpaceGraph } from './src';
import { N8nWorkflowPlugin } from './packages/n8n-bridge/src/N8nWorkflowPlugin';

const container = document.getElementById('spacegraph-container');
if (!container) throw new Error('Container not found');

const spec = { nodes: [], edges: [] };

const sg = new SpaceGraph(container);
sg.pluginManager.register('N8nWorkflowPlugin', new N8nWorkflowPlugin());
sg.init().then(() => {
    sg.loadSpec(spec);
    sg.render();
    console.log("Plugins initialized and graph ready");
});
