import { SpaceGraph } from '../framework';
import { N8nExecutionMonitorPlugin } from '../../packages/n8n-bridge/src/N8nExecutionMonitorPlugin';
import { N8nWorkflowPlugin } from '../../packages/n8n-bridge/src/N8nWorkflowPlugin';

export default async function n8nDemo(): Promise<SpaceGraph> {
    const nodes = [
        {
            id: 'palette',
            type: 'N8nPaletteNode',
            position: [-800, 200, 0],
        },
        {
            id: 'cred-1',
            type: 'N8nCredentialNode',
            position: [-400, 200, 0],
            parameters: {
                service: 'GitHub API',
            },
        },
        {
            id: 'hitl-1',
            type: 'N8nHitlNode',
            position: [0, -300, 0],
            parameters: {
                taskSummary: 'Review summarized data before committing.',
            },
        },
        {
            id: 'webhook-1',
            type: 'N8nTriggerNode',
            position: [-400, 0, 0],
            parameters: {
                triggerType: 'webhook',
            },
        },
        {
            id: 'ai-1',
            type: 'N8nAiNode',
            position: [0, 0, 0],
            parameters: {
                model: 'gpt-4o',
                prompt: 'Summarize the input data.',
            },
        },
        {
            id: 'http-1',
            type: 'N8nHttpNode',
            position: [400, -200, 0],
            parameters: {
                requestMethod: 'GET',
                url: 'https://api.github.com',
            },
        },
        {
            id: 'code-1',
            type: 'N8nCodeNode',
            position: [400, 200, 0],
            parameters: {
                jsCode: 'return items;',
            },
        },
    ];

    const edges = [
        { id: 'e1', source: 'webhook-1', target: 'ai-1', type: 'FlowEdge' },
        { id: 'e2', source: 'ai-1', target: 'http-1', type: 'FlowEdge' },
        { id: 'e3', source: 'ai-1', target: 'code-1', type: 'FlowEdge' },
    ];

    const container = document.getElementById('app');
    if (!container) throw new Error('Container #app not found');

    const sg = new SpaceGraph(container);

    // Register n8n specific plugins
    sg.pluginManager.register('N8nExecutionMonitorPlugin', new N8nExecutionMonitorPlugin());
    sg.pluginManager.register('N8nWorkflowPlugin', new N8nWorkflowPlugin());

    await sg.init();
    sg.loadSpec({ nodes, edges });
    sg.render();

    // Trigger a mock execution state after 1 second to see the log panel and particles
    setTimeout(() => {
        sg.update({
            nodes: [
                { id: 'webhook-1', parameters: { status: 'success' } },
                {
                    id: 'n8n-exec-log',
                    type: 'ExecutionLogPanel',
                    position: [800, -400, 0],
                    parameters: {
                        newLog: { message: 'Workflow started', type: 'info' },
                    },
                },
            ],
        });

        const edge = sg.graph.getEdge('e1');
        if (edge && typeof (edge as any).startDataFlow === 'function') {
            (edge as any).startDataFlow(2.0);
        }
    }, 1000);

    return sg;
}
