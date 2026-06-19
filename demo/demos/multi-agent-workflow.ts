import { createDemoWithNodes, SpaceGraph } from '../framework';

export default async function multiAgentWorkflowDemo(): Promise<SpaceGraph> {
  const markdownContentRouter = `
### Orchestrator Agent
**Role:** Root Router
**Goal:** Parse incoming requests and route to the appropriate sub-agent based on intent.
* If coding task -> Send to **Dev Agent**
* If analysis task -> Send to **Data Agent**
        `;

  const markdownContentDev = `
### Developer Agent
**Role:** Software Engineer
**Tools:** Code Interpreter, GitHub API
**Goal:** Write, test, and commit code based on the Orchestrator's prompt.
        `;

  const markdownContentData = `
### Data Analyst Agent
**Role:** Analyst
**Tools:** Python Interpreter, SQL Engine
**Goal:** Query databases and generate charts for analysis.
        `;

  const nodes = [
    // --- Orchestrator Level ---
    {
      id: 'group-orchestrator',
      type: 'GroupNode',
      label: 'Orchestrator Swarm',
      position: [0, 300, 0],
      data: { width: 500, height: 400, color: '#3b82f6', expanded: true },
    },
    {
      id: 'agent-orchestrator-md',
      type: 'MarkdownNode',
      parent: 'group-orchestrator',
      position: [-100, 50, 0], // Relative to parent
      data: {
        markdown: markdownContentRouter,
        width: 280,
        color: 'rgba(15, 23, 42, 0.9)',
      },
    },
    {
      id: 'agent-orchestrator-status',
      type: 'DataNode',
      parent: 'group-orchestrator',
      position: [120, 50, 0], // Relative to parent
      data: {
        data: { status: 'Idle', lastTask: 'None', memoryUsage: '45MB' },
        width: 200,
        theme: 'dark',
      },
    },

    // --- Dev Agent Level ---
    {
      id: 'group-dev',
      type: 'GroupNode',
      label: 'Developer Swarm',
      position: [-400, -200, 0],
      data: { width: 450, height: 350, color: '#10b981', expanded: true },
    },
    {
      id: 'agent-dev-md',
      type: 'MarkdownNode',
      parent: 'group-dev',
      position: [-100, 0, 0], // Relative to parent
      data: {
        markdown: markdownContentDev,
        width: 220,
        color: 'rgba(15, 23, 42, 0.9)',
      },
    },
    {
      id: 'agent-dev-tools',
      type: 'HtmlNode',
      parent: 'group-dev',
      position: [100, 0, 0], // Relative to parent
      data: {
        html: `
                        <div style="background: rgba(15,23,42,0.9); padding: 10px; border-radius: 8px; border: 1px solid #10b981;">
                            <h4 style="color: #34d399;">Active Tools</h4>
                            <ul style="color: #94a3b8; font-size: 12px; padding-left: 20px;">
                                <li>Terminal</li>
                                <li>File System</li>
                                <li>Linter</li>
                            </ul>
                        </div>
                    `,
        width: 180,
        height: 120,
      },
    },

    // --- Data Agent Level ---
    {
      id: 'group-data',
      type: 'GroupNode',
      label: 'Data Analyst Swarm',
      position: [400, -200, 0],
      data: { width: 450, height: 350, color: '#8b5cf6', expanded: true },
    },
    {
      id: 'agent-data-md',
      type: 'MarkdownNode',
      parent: 'group-data',
      position: [0, 80, 0], // Relative to parent
      data: {
        markdown: markdownContentData,
        width: 380,
        color: 'rgba(15, 23, 42, 0.9)',
      },
    },
    {
      id: 'agent-data-chart',
      type: 'ChartNode',
      parent: 'group-data',
      position: [0, -60, 0], // Relative to parent
      data: {
        chartType: 'bar',
        width: 380,
        height: 150,
        theme: 'dark',
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{ label: 'Revenue', data: [120, 190, 300, 500], color: '#a855f7' }],
      },
    },

    // --- User Input / Output ---
    {
      id: 'user-input',
      type: 'NoteNode',
      label: 'User Request',
      position: [0, 650, 0],
      data: { text: 'Analyze the Q3 revenue data and then write a python script to export it.', color: '#ef4444' },
    },
    {
      id: 'control-panel',
      type: 'HtmlNode',
      position: [0, -600, 0],
      data: {
        html: `
                        <div style="background: rgba(15, 23, 42, 0.9); padding: 20px; border-radius: 8px; border: 1px solid #3b82f6; width: 200px;">
                            <button id="btn-run" style="width: 100%; padding: 10px; background: #3b82f6; border: none; border-radius: 4px; color: white; cursor: pointer; font-weight: bold;">Run Workflow</button>
                        </div>
                    `,
        width: 200,
        height: 80,
      },
    },
  ];

  const edges = [
    // User to Orchestrator
    {
      id: 'e-in',
      source: 'user-input',
      target: 'group-orchestrator',
      type: 'AnimatedEdge',
      data: { color: 0xef4444, speed: 0.01, particleColor: 0xffffff },
    },

    // Orchestrator Routing
    { id: 'e-route-dev', source: 'group-orchestrator', target: 'group-dev', type: 'FlowEdge', data: { color: 0x3b82f6, flowSpeed: 2 } },
    { id: 'e-route-data', source: 'group-orchestrator', target: 'group-data', type: 'FlowEdge', data: { color: 0x3b82f6, flowSpeed: 2 } },

    // Collaboration between agents
    { id: 'e-collab', source: 'group-data', target: 'group-dev', type: 'DottedEdge', data: { color: 0xf59e0b, dashSize: 5, gapSize: 5 } },
  ];

  const sg = await createDemoWithNodes(nodes, edges);

  sg.events.on('render', () => {
    const controlNode = sg.graph.nodes.get('control-panel') as any;
    if (controlNode && controlNode.domElement && !controlNode._eventsAttached) {
      const btnRun = controlNode.domElement.querySelector('#btn-run');
      let isRunning = false;

      if (btnRun) {
        btnRun.addEventListener('click', () => {
          if (isRunning) return;
          isRunning = true;
          btnRun.innerText = 'Running...';
          btnRun.style.background = '#64748b';

          const statusNode = sg.graph.nodes.get('agent-orchestrator-status');
          const dataChart = sg.graph.nodes.get('agent-data-chart');

          // 1. Orchestrator Processing
          setTimeout(() => {
            if (statusNode) statusNode.updateSpec({ data: { data: { status: 'Routing', lastTask: 'Parse Input', memoryUsage: '128MB' } } });

            const eIn = sg.graph.edges.find((e) => e.id === 'e-in');
            if (eIn) eIn.updateSpec({ data: { speed: 0.05 } });
          }, 500);

          // 2. Data Agent execution
          setTimeout(() => {
            if (statusNode) statusNode.updateSpec({ data: { data: { status: 'Delegated', lastTask: 'Sent to Data Agent', memoryUsage: '80MB' } } });

            const eRouteData = sg.graph.edges.find((e) => e.id === 'e-route-data');
            if (eRouteData) eRouteData.updateSpec({ data: { flowSpeed: 5, color: '#8b5cf6' } });

            if (dataChart) {
              // Update chart to simulate "analysis"
              dataChart.updateSpec({
                data: {
                  datasets: [{ label: 'Revenue', data: [150, 210, 350, 550], color: '#d946ef' }],
                },
              });
            }
          }, 2000);

          // 3. Collaboration (Data sends info to Dev)
          setTimeout(() => {
            const eCollab = sg.graph.edges.find((e) => e.id === 'e-collab');
            if (eCollab) {
              // Hacky way to simulate a flow on a dotted edge for the demo
              eCollab.updateSpec({ data: { color: '#ef4444', dashSize: 20 } });
            }
          }, 4000);

          // 4. Dev Agent execution
          setTimeout(() => {
            const eRouteDev = sg.graph.edges.find((e) => e.id === 'e-route-dev');
            if (eRouteDev) eRouteDev.updateSpec({ data: { flowSpeed: 5, color: '#10b981' } });

            const toolsNode = sg.graph.nodes.get('agent-dev-tools');
            if (toolsNode) {
              toolsNode.updateSpec({
                data: {
                  html: `
                                <div style="background: rgba(15,23,42,0.9); padding: 10px; border-radius: 8px; border: 1px solid #10b981;">
                                    <h4 style="color: #34d399;">Active Tools</h4>
                                    <ul style="color: #f8fafc; font-size: 12px; padding-left: 20px;">
                                        <li>> Terminal: <span style="color:#fbbf24">Writing export_data.py</span></li>
                                        <li>> File System: <span style="color:#10b981">Saved</span></li>
                                        <li>> Linter: <span style="color:#10b981">Pass</span></li>
                                    </ul>
                                </div>
                            `,
                },
              });
            }
          }, 5000);

          // 5. Completion
          setTimeout(() => {
            if (statusNode) statusNode.updateSpec({ data: { data: { status: 'Complete', lastTask: 'Workflow Finished', memoryUsage: '40MB' } } });

            const eRouteData = sg.graph.edges.find((e) => e.id === 'e-route-data');
            if (eRouteData) eRouteData.updateSpec({ data: { flowSpeed: 2, color: 0x3b82f6 } });

            const eRouteDev = sg.graph.edges.find((e) => e.id === 'e-route-dev');
            if (eRouteDev) eRouteDev.updateSpec({ data: { flowSpeed: 2, color: 0x3b82f6 } });

            const eIn = sg.graph.edges.find((e) => e.id === 'e-in');
            if (eIn) eIn.updateSpec({ data: { speed: 0.01 } });

            btnRun.innerText = 'Run Workflow';
            btnRun.style.background = '#3b82f6';
            isRunning = false;
          }, 8000);
        });
      }
      controlNode._eventsAttached = true;
    }
  });

  return sg;
}
