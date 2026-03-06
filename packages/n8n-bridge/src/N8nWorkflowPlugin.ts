import type { SpaceGraph, SpaceGraphPlugin } from 'spacegraphjs';
import gsap from 'gsap';
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

        const node = this.sg.graph.nodes.get(state.nodeId);
        if (node && node.object) {
            // Kill any existing animation on this node to avoid conflicts
            gsap.killTweensOf(node.object.scale);
            if (node.object.material && !Array.isArray(node.object.material)) {
                gsap.killTweensOf(node.object.material);
            }

            if (state.status === 'running') {
                gsap.to(node.object.scale, {
                    x: 1.1,
                    y: 1.1,
                    z: 1.1,
                    duration: 0.5,
                    yoyo: true,
                    repeat: -1,
                    ease: "sine.inOut"
                });
            } else if (state.status === 'success') {
                gsap.to(node.object.scale, {
                    x: 1,
                    y: 1,
                    z: 1,
                    duration: 0.3,
                    ease: "back.out(1.7)"
                });
            } else if (state.status === 'error') {
                gsap.to(node.object.scale, {
                    x: 1,
                    y: 1,
                    z: 1,
                    duration: 0.3,
                    ease: "bounce.out"
                });
            } else {
                 // Reset scale for waiting/skipped
                 gsap.to(node.object.scale, {
                    x: 1,
                    y: 1,
                    z: 1,
                    duration: 0.2
                 });
            }
        }

        // Handle edges if needed (e.g. turning output edges red on error)
    }

    showHeatmap(executionId: string): void {
        console.log(`[N8nWorkflowPlugin] Showing heatmap for execution ${executionId}`);

        // Mock execution durations per node for demonstration.
        // In reality, this would query the bridge or execution state for actual durations.
        const nodes = Array.from(this.sg.graph.nodes.values());

        let maxDuration = 0;
        const durations = new Map<string, number>();

        nodes.forEach(node => {
            // Mocking duration between 10ms and 5000ms
            const duration = Math.random() * 5000 + 10;
            durations.set(node.id, duration);
            if (duration > maxDuration) {
                maxDuration = duration;
            }
        });

        const updateSpecs = nodes.map(node => {
            const duration = durations.get(node.id) || 0;
            // Normalize duration to 0-1
            const normalized = maxDuration > 0 ? duration / maxDuration : 0;

            // Map 0 -> cool blue (240 hue), 1 -> warm red (0 hue)
            const h = 240 - (normalized * 240);
            const s = 1.0;
            const l = 0.5;

            // HSL to Hex
            const c = (1 - Math.abs(2 * l - 1)) * s;
            const x = c * (1 - Math.abs((h / 60) % 2 - 1));
            const m = l - c / 2;
            let r = 0, g = 0, b = 0;

            if (0 <= h && h < 60) { r = c; g = x; b = 0; }
            else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
            else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
            else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
            else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
            else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

            const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
            const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
            const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');
            const hexColor = `#${rHex}${gHex}${bHex}`;

            return {
                id: node.id,
                color: hexColor,
                parameters: {
                    ...node.parameters,
                    executionDuration: duration
                }
            };
        });

        this.sg.update({ nodes: updateSpecs });
    }

    dispose(): void {
        if (this.bridge) {
             this.bridge.dispose();
        }
    }
}
