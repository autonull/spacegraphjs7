import type { SpaceGraph, SpaceGraphPlugin } from 'spacegraphjs';
import gsap from 'gsap';
import { N8nBridge } from './spacegraph-n8n-bridge';
import type { ExecutionState } from './types';

export class N8nWorkflowPlugin implements SpaceGraphPlugin {
    name = 'N8nWorkflowPlugin';
    private bridge!: N8nBridge;
    private sg!: SpaceGraph;

    private onKeyDown = (e: KeyboardEvent) => {
        if (e.key === '/') {
            // Prevent if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            e.preventDefault();
            this.showPromptOverlay();
        }
    };

    private showPromptOverlay() {
        const existing = document.getElementById('spacegraph-n8n-prompt-builder');
        if (existing) return;

        const overlay = document.createElement('div');
        overlay.id = 'spacegraph-n8n-prompt-builder';
        overlay.style.position = 'absolute';
        overlay.style.top = '50%';
        overlay.style.left = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
        overlay.style.background = 'rgba(20, 20, 20, 0.95)';
        overlay.style.border = '2px solid #3f51b5';
        overlay.style.borderRadius = '8px';
        overlay.style.padding = '20px';
        overlay.style.zIndex = '1000';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.gap = '10px';
        overlay.style.width = '400px';
        overlay.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';

        const label = document.createElement('label');
        label.textContent = '✨ What workflow do you want to build?';
        label.style.color = 'white';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '16px';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'e.g., A researcher agent that searches the web';
        input.style.padding = '10px';
        input.style.borderRadius = '4px';
        input.style.border = '1px solid #555';
        input.style.background = '#333';
        input.style.color = 'white';
        input.style.outline = 'none';
        input.style.fontSize = '14px';

        const info = document.createElement('div');
        info.textContent = 'Press Enter to generate, Esc to cancel';
        info.style.color = '#aaa';
        info.style.fontSize = '12px';
        info.style.textAlign = 'right';

        overlay.appendChild(label);
        overlay.appendChild(input);
        overlay.appendChild(info);

        document.body.appendChild(overlay);
        input.focus();

        const close = () => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                close();
            } else if (e.key === 'Enter') {
                this.generateWorkflowFromPrompt(input.value);
                close();
            }
        });
    }

    private generateWorkflowFromPrompt(prompt: string) {
        const text = prompt.toLowerCase();

        let mockSpec: any = null;

        if (text.includes('research') || text.includes('agent')) {
            mockSpec = {
                nodes: [
                    { id: `trigger-${Date.now()}`, type: 'N8nTriggerNode', position: [0, 0, 0], label: 'Start' },
                    { id: `agent-${Date.now()}`, type: 'N8nAiNode', position: [300, 0, 0], label: 'Research Agent', parameters: { model: 'gpt-4o', prompt: 'You are a researcher...' } },
                    { id: `code-${Date.now()}`, type: 'N8nCodeNode', position: [600, 0, 0], label: 'Format Results' }
                ],
                edges: [
                    { id: `e1-${Date.now()}`, source: `trigger-${Date.now()}`, target: `agent-${Date.now()}`, type: 'FlowEdge' },
                    { id: `e2-${Date.now()}`, source: `agent-${Date.now()}`, target: `code-${Date.now()}`, type: 'FlowEdge' }
                ]
            };
        } else if (text.includes('rag') || text.includes('vector')) {
             mockSpec = {
                nodes: [
                    { id: `http-${Date.now()}`, type: 'N8nHttpNode', position: [0, 0, 0], label: 'Fetch Data', parameters: { url: 'https://example.com/docs' } },
                    { id: `ai-${Date.now()}`, type: 'N8nAiNode', position: [300, 0, 0], label: 'LLM Node' },
                    { id: `vector-${Date.now()}`, type: 'ChartNode', position: [300, -200, 0], label: 'Vector Store' }
                ],
                edges: [
                    { id: `e1-${Date.now()}`, source: `http-${Date.now()}`, target: `ai-${Date.now()}`, type: 'FlowEdge' },
                    { id: `e2-${Date.now()}`, source: `ai-${Date.now()}`, target: `vector-${Date.now()}`, type: 'DottedEdge' }
                ]
            };
        } else {
             mockSpec = {
                nodes: [
                    { id: `trigger-${Date.now()}`, type: 'N8nTriggerNode', position: [0, 0, 0], label: 'Webhook' },
                    { id: `code-${Date.now()}`, type: 'N8nCodeNode', position: [300, 0, 0], label: 'Execute Code' }
                ],
                edges: [
                    { id: `e1-${Date.now()}`, source: `trigger-${Date.now()}`, target: `code-${Date.now()}`, type: 'FlowEdge' }
                ]
            };
        }

        if (mockSpec) {
            this.sg.loadSpec(mockSpec);

            // Re-run auto layout if available
            const autoLayout = this.sg.pluginManager.getPlugin('AutoLayoutPlugin') as any;
            if (autoLayout && autoLayout.apply) {
                setTimeout(() => autoLayout.apply(), 100);
            }
        }
    }

    init(sg: SpaceGraph): void {
        this.sg = sg;
        this.bridge = new N8nBridge(sg);

        // Nodes are already registered via SpaceGraph.init() per the plan,
        // but we could also do it here dynamically if we wanted to avoid core modification.
        // For now, this plugin focuses on the lifecycle and bridge state sync.

        this.bridge.executionState.subscribe((state: ExecutionState | null) => {
             if (state) this.applyExecutionVisuals(state);
        });

        window.addEventListener('keydown', this.onKeyDown);
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
        window.removeEventListener('keydown', this.onKeyDown);
        if (this.bridge) {
             this.bridge.dispose();
        }
    }
}
