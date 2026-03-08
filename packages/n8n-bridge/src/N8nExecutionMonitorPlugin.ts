import type { SpaceGraph, SpaceGraphPlugin, NodeSpec, SpecUpdate } from 'spacegraphjs';
import { N8nBridge } from './spacegraph-n8n-bridge';
import type { ExecutionState, OSProcessUpdate } from './types';
import gsap from 'gsap';

interface TimelineEvent {
    timestamp: number;
    state: ExecutionState;
}

export class N8nExecutionMonitorPlugin implements SpaceGraphPlugin {
    name = 'N8nExecutionMonitorPlugin';
    private bridge!: N8nBridge;
    private sg!: SpaceGraph;
    private timelineHistory: TimelineEvent[] = [];
    private isReplaying = false;

    init(sg: SpaceGraph): void {
        this.sg = sg;
        // Re-use an existing bridge instance if available, or create a new one hooked to the same WS
        // In a real app, the bridge instance should ideally be shared or a singleton context
        this.bridge = new N8nBridge(sg);

        this.bridge.executionState.subscribe((state: ExecutionState | null) => {
             if (state) this.applyExecutionVisuals(state);
        });

        this.bridge.osProcessUpdates.subscribe((processUpdate: OSProcessUpdate) => {
             this.applyOSProcessUpdate(processUpdate);
        });

        // Listen for scrub events from TimelineSliderNode
        this.sg.events.on('timeline:scrub', (payload: any) => {
            this.handleTimelineScrub(payload.value);
        });
    }

    public startReplaySession(): void {
        if (this.timelineHistory.length === 0) {
            console.warn('[N8nExecutionMonitorPlugin] No execution history to replay.');
            return;
        }

        this.isReplaying = true;

        // Instantiate slider
        const sliderSpec: NodeSpec = {
            id: 'timeline-slider',
            type: 'TimelineSliderNode',
            position: [0, -500, 0], // Positioned low
            parameters: {
                min: 0,
                max: this.timelineHistory.length - 1,
                value: 0,
                currentTimestamp: new Date(this.timelineHistory[0].timestamp).toISOString()
            }
        };

        // Remove existing if any
        if (this.sg.graph.nodes.has('timeline-slider')) {
            this.sg.graph.removeNode('timeline-slider');
        }

        this.sg.graph.addNode(sliderSpec);

        // Apply Timeline Layout
        const layout = this.sg.pluginManager.getPlugin('TimelineLayout') as any;
        if (layout && layout.apply) {
            // Apply temporal data to nodes based on history
            const firstEventTime = this.timelineHistory[0].timestamp;

            // Initialize all nodes to time 0, we'll update them as they appear in history
            this.sg.graph.nodes.forEach(node => {
                if (!node.data) node.data = {};
                node.data.timestamp = 0; // Default
            });

            // Set timestamps for nodes involved in the execution
            this.timelineHistory.forEach(event => {
                if (event.state.nodeId) {
                    const node = this.sg.graph.nodes.get(event.state.nodeId);
                    if (node) {
                        // Keep the earliest time it was activated, or whatever logic fits
                        if (node.data.timestamp === 0) {
                            node.data.timestamp = event.timestamp - firstEventTime;
                        }
                    }
                }
            });

            layout.settings.orientation = 'horizontal';
            layout.settings.scaleFactor = 0.5;
            layout.apply();
        }

        // Apply first state
        this.handleTimelineScrub(0);
    }

    private handleTimelineScrub(index: number) {
        if (!this.isReplaying || this.timelineHistory.length === 0) return;

        const safeIndex = Math.max(0, Math.min(index, this.timelineHistory.length - 1));
        const event = this.timelineHistory[safeIndex];

        // Reset all nodes to base state, then apply history up to safeIndex
        this.sg.graph.nodes.forEach(node => {
            // Very naive reset
            if (node.id !== 'timeline-slider' && node.id !== 'os-system-processes' && !node.id.startsWith('os-proc-')) {
                this.sg.update({ nodes: [{ id: node.id, color: '#9e9e9e', parameters: { status: 'waiting' } }] });
            }
        });

        for (let i = 0; i <= safeIndex; i++) {
            const h = this.timelineHistory[i];
            if (h.state.nodeId) {
                // Apply without animations during scrub for responsiveness
                const colorMap: Record<string, string> = {
                    'waiting': '#9e9e9e',
                    'running': '#2196f3',
                    'success': '#4caf50',
                    'error': '#f44336',
                    'skipped': '#bdbdbd'
                };
                this.sg.update({
                    nodes: [{
                        id: h.state.nodeId,
                        color: colorMap[h.state.status],
                        parameters: { status: h.state.status, error: h.state.error }
                    }]
                });
            }
        }
    }

    private applyOSProcessUpdate(processUpdate: OSProcessUpdate) {
        let systemGroup = this.sg.graph.nodes.get('os-system-processes');

        if (!systemGroup) {
            // Create System Processes GroupNode if it doesn't exist
            const groupSpec: NodeSpec = {
                id: 'os-system-processes',
                type: 'GroupNode',
                position: [1000, 1000, 0],
                label: 'System Processes',
                parameters: { label: 'System Processes' }
            };
            this.sg.graph.addNode(groupSpec);
            systemGroup = this.sg.graph.nodes.get('os-system-processes');
        }

        if (!systemGroup) return;

        const processNodeId = `os-proc-${processUpdate.pid}`;
        const processNode = this.sg.graph.nodes.get(processNodeId);

        let processColor = '#4caf50'; // running/success
        if (processUpdate.status === 'error') processColor = '#f44336';
        else if (processUpdate.status === 'stopped') processColor = '#9e9e9e';

        const procHtml = `
            <div style="padding:8px; border-radius:4px; background:rgba(0,0,0,0.8); color:white; border: 1px solid ${processColor}">
                <div style="font-weight:bold">${processUpdate.name}</div>
                <div style="font-size:12px; color:#aaa">PID: ${processUpdate.pid} | Status: ${processUpdate.status}</div>
                <div style="font-size:12px; color:#aaa">CPU: ${processUpdate.cpu.toFixed(1)}% | Mem: ${processUpdate.memory.toFixed(1)}MB</div>
            </div>
        `;

        if (processNode) {
            // Update existing process node
            const updateSpec: SpecUpdate = {
                nodes: [{
                    id: processNodeId,
                    parameters: { html: procHtml }
                }]
            };
            this.sg.update(updateSpec);
        } else {
            // Add new process node inside the group
            const procSpec: NodeSpec = {
                id: processNodeId,
                type: 'HtmlNode',
                // Position it relative to the group node
                position: [systemGroup.position.x, systemGroup.position.y - 150 * (this.sg.graph.nodes.size % 5 + 1), 0],
                parameters: { html: procHtml }
            };
            this.sg.graph.addNode(procSpec);

            // Connect to group conceptually using an edge
            this.sg.graph.addEdge({
                id: `edge-${processNodeId}`,
                source: systemGroup.id,
                target: processNodeId,
                type: 'DottedEdge'
            });
        }
    }

    update(_delta: number): void {
        // Continuous updates are handled by the nodes themselves
    }

    private applyExecutionVisuals(state: ExecutionState) {
        // Record history
        if (!this.isReplaying) {
            this.timelineHistory.push({
                timestamp: Date.now(),
                state: state
            });
        }

        if (!state.nodeId) {
            if (state.status === 'success' || state.status === 'error') {
                 console.log(`[N8nExecutionMonitorPlugin] Workflow execution ${state.executionId} finished: ${state.status}`);
            }
            return;
        }

        if (this.isReplaying) return; // Prevent live updates during replay

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
            gsap.killTweensOf(node.object.scale);

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

                // Turn outgoing edges red
                this.sg.graph.edges.forEach((edge) => {
                    if (edge.source.id === state.nodeId) {
                        this.sg.update({ edges: [{ id: edge.id, type: 'AnimatedEdge', data: { color: 0xf44336 } }] });
                    }
                });

            } else {
                 gsap.to(node.object.scale, {
                    x: 1,
                    y: 1,
                    z: 1,
                    duration: 0.2
                 });
            }
        }

        // Manage FlowEdge particles
        if (state.status === 'running') {
             this.sg.graph.edges.forEach((edge) => {
                 if (edge.source.id === state.nodeId && typeof (edge as any).startDataFlow === 'function') {
                      (edge as any).startDataFlow(2.0); // Boost rate
                 }
             });
        } else if (state.status === 'success' || state.status === 'error') {
             this.sg.graph.edges.forEach((edge) => {
                 if (edge.source.id === state.nodeId && typeof (edge as any).stopDataFlow === 'function') {
                      (edge as any).stopDataFlow();
                 }
             });
        }
    }

    dispose(): void {
        if (this.bridge) {
             this.bridge.dispose();
        }
    }
}
