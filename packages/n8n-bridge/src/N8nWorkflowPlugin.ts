import type { SpaceGraph, SpaceGraphPlugin } from 'spacegraphjs';
import { N8nBridge } from './spacegraph-n8n-bridge';
import type { ExecutionState } from './types';

export class N8nWorkflowPlugin implements SpaceGraphPlugin {
    name = 'N8nWorkflowPlugin';
    private bridge!: N8nBridge;
    private sg!: SpaceGraph;

    init(sg: SpaceGraph): void {
        this.sg = sg;
        this.bridge = new N8nBridge(sg);

        // Nodes are already registered via SpaceGraph.init() per the plan,
        // but we could also do it here dynamically if we wanted to avoid core modification.
        // For now, this plugin focuses on the lifecycle and bridge state sync.

        this.bridge.executionState.subscribe((state: ExecutionState | null) => {
             if (state) this.applyExecutionVisuals(state);
        });
    }

    update(_delta: number): void {
        // Continuous updates if needed
    }

    private applyExecutionVisuals(state: ExecutionState) {
        if (!state.nodeId) {
            // Workflow-level state (e.g. execution start/end)
            if (state.status === 'success' || state.status === 'error') {
                 console.log(`[N8nWorkflowPlugin] Workflow execution ${state.executionId} finished with status: ${state.status}`);
                 // E.g. trigger heatmap or summary
            }
            return;
        }

        // Apply visual updates to a specific node based on execution state
        const colorMap: Record<string, string> = {
             'waiting': '#9e9e9e',
             'running': '#2196f3',
             'success': '#4caf50',
             'error': '#f44336',
             'skipped': '#bdbdbd'
        };

        const updateSpec = {
            id: state.nodeId,
            color: colorMap[state.status],
            parameters: {
                 status: state.status,
                 error: state.error
            }
        };

        this.sg.update({ nodes: [updateSpec] });

        // Handle edges if needed (e.g. turning output edges red on error)
    }

    dispose(): void {
        if (this.bridge) {
             this.bridge.dispose();
        }
    }
}
