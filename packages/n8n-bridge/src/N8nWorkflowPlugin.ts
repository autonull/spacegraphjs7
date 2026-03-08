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
        if (document.getElementById('spacegraph-n8n-prompt-builder')) return;

        const overlay = document.createElement('div');
        overlay.id = 'spacegraph-n8n-prompt-builder';
        Object.assign(overlay.style, {
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'rgba(20, 20, 20, 0.95)', border: '2px solid #3f51b5', borderRadius: '8px',
            padding: '20px', zIndex: '1000', display: 'flex', flexDirection: 'column', gap: '10px',
            width: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        });

        const label = document.createElement('label');
        label.textContent = '✨ What workflow do you want to build?';
        Object.assign(label.style, { color: 'white', fontWeight: 'bold', fontSize: '16px' });

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'e.g., A researcher agent that searches the web';
        Object.assign(input.style, {
            padding: '10px', borderRadius: '4px', border: '1px solid #555',
            background: '#333', color: 'white', outline: 'none', fontSize: '14px'
        });

        const info = document.createElement('div');
        info.textContent = 'Press Enter to generate, Esc to cancel';
        Object.assign(info.style, { color: '#aaa', fontSize: '12px', textAlign: 'right' });

        overlay.append(label, input, info);
        document.body.appendChild(overlay);
        input.focus();

        const close = () => overlay.remove();

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close();
            else if (e.key === 'Enter') {
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
            if (state.status === 'success' || state.status === 'error') {
                 console.log(`[N8nWorkflowPlugin] Workflow execution ${state.executionId} finished with status: ${state.status}`);
            }
            return;
        }

        const colorMap: Record<string, string> = {
            'waiting': '#9e9e9e', 'running': '#2196f3', 'success': '#4caf50',
            'error': '#f44336', 'skipped': '#bdbdbd'
        };

        this.sg.update({ nodes: [{
            id: state.nodeId,
            color: colorMap[state.status] || colorMap.waiting,
            parameters: { status: state.status, error: state.error }
        }] });

        const node = this.sg.graph.nodes.get(state.nodeId);
        if (node?.object) {
            gsap.killTweensOf(node.object.scale);
            if (node.object.material && !Array.isArray(node.object.material)) {
                gsap.killTweensOf(node.object.material);
            }

            const anims: Record<string, any> = {
                'running': { scale: 1.1, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" },
                'success': { scale: 1, duration: 0.3, ease: "back.out(1.7)" },
                'error': { scale: 1, duration: 0.3, ease: "bounce.out" }
            };

            const conf = anims[state.status] || { scale: 1, duration: 0.2 };
            gsap.to(node.object.scale, { x: conf.scale, y: conf.scale, z: conf.scale, ...conf });
        }
    }

    showHeatmap(executionId: string): void {
        console.log(`[N8nWorkflowPlugin] Showing heatmap for execution ${executionId}`);

        const nodes = Array.from(this.sg.graph.nodes.values());
        const durations = new Map(nodes.map(n => [n.id, Math.random() * 5000 + 10]));
        const maxDuration = Math.max(...durations.values(), 1);

        const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');

        const updateSpecs = nodes.map(node => {
            const duration = durations.get(node.id) || 0;
            const normalized = duration / maxDuration;

            const h = 240 - (normalized * 240);
            const s = 1.0, l = 0.5;

            const c = (1 - Math.abs(2 * l - 1)) * s;
            const x = c * (1 - Math.abs((h / 60) % 2 - 1));
            const m = l - c / 2;
            let [r, g, b] = [0, 0, 0];

            if (h < 60) [r, g, b] = [c, x, 0];
            else if (h < 120) [r, g, b] = [x, c, 0];
            else if (h < 180) [r, g, b] = [0, c, x];
            else if (h < 240) [r, g, b] = [0, x, c];
            else if (h < 300) [r, g, b] = [x, 0, c];
            else [r, g, b] = [c, 0, x];

            return {
                id: node.id,
                color: `#${toHex(r + m)}${toHex(g + m)}${toHex(b + m)}`,
                parameters: { ...node.parameters, executionDuration: duration }
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
