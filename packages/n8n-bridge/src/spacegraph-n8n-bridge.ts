import { Subject, BehaviorSubject, Observable } from 'rxjs';
import type { SpaceGraph } from 'spacegraphjs';
import { WorkflowMapper } from './WorkflowMapper';
import type { N8nWorkflowJSON, N8nWorkflowDiff, ExecutionState, OSProcessUpdate } from './types';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { GraphSpec } from 'spacegraphjs';
import { N8nCollaborationPlugin } from './N8nCollaborationPlugin';
import { pkgLogger } from './logger';

const log = pkgLogger('[N8nBridge]');

export class N8nBridge {
    private sg: SpaceGraph;
    private wsClient!: WebSocket;           // connects to n8n-bridge-server
    private workflowDiff$ = new Subject<N8nWorkflowDiff>();
    private executionState$ = new BehaviorSubject<ExecutionState | null>(null);
    private osProcess$ = new Subject<OSProcessUpdate>();
    private serverUrl: string;

    constructor(sg: SpaceGraph, bridgeServerUrl = 'ws://localhost:5679') {
        this.sg = sg;
        this.serverUrl = bridgeServerUrl;
        this.connect();

        // Initialize Collaboration Plugin (Y.js CRDT sync)
        const collabPlugin = new N8nCollaborationPlugin('n8n-workflow-room', 'ws://localhost:1234');
        this.sg.pluginManager.register('N8nCollaborationPlugin', collabPlugin);
        // Note: The plugin manager will automatically call init() on it if SpaceGraph is already initialized,
        // or we can call it manually if needed. To be safe:
        collabPlugin.init(this.sg);
    }

    private connect() {
        this.wsClient = new WebSocket(this.serverUrl);

        this.wsClient.onopen = () => {
            log.info('Connected to server');
        };

        this.wsClient.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (e) {
                log.error('Failed to parse message', e);
            }
        };

        this.wsClient.onclose = () => {
            log.warn('Disconnected from server. Reconnecting in 5s...');
            setTimeout(() => this.connect(), 5000);
        };
    }

    private handleMessage(message: any) {
        const handlers: Record<string, () => void> = {
            'workflow:loaded': () => {
                const spec = WorkflowMapper.toGraphSpec(message.data as N8nWorkflowJSON);
                this.sg.loadSpec(spec);
            },
            'execution:progress': () => this.executionState$.next(message.data as ExecutionState),
            'execution:complete': () => this.executionState$.next(message.data as ExecutionState),
            'workflow:diff': () => this.workflowDiff$.next(message.data as N8nWorkflowDiff),
            'os:process:update': () => this.osProcess$.next(message.data as OSProcessUpdate),
        };

        const handler = handlers[message.type];
        if (handler) {
            handler();
        } else {
            log.warn('Unknown message type:', message.type);
        }
    }

    // Load a workflow by ID from the n8n server -> render in SpaceGraph
    async loadWorkflow(workflowId: string): Promise<void> {
        this.send({ type: 'loadWorkflow', workflowId });
    }

    // Push a node position change from SpaceGraph -> n8n metadata store
    pushNodePositionUpdate(nodeId: string, x: number, y: number): void {
        this.send({ type: 'node:moved', nodeId, position: [x, -y] });
    }

    // Trigger workflow execution
    async executeWorkflow(workflowId: string): Promise<string> {
        return new Promise((resolve) => {
            // Very simple stub for generating executionId temporarily
            const executionId = Math.random().toString(36).substring(7);
            this.send({ type: 'execute:trigger', workflowId, executionId });
            resolve(executionId);
        });
    }

    exportWorkflowJSON(): N8nWorkflowJSON {
        // Build a temporary GraphSpec payload from the current graph state
        const spec: GraphSpec = {
            nodes: Array.from(this.sg.graph.nodes.values()).map(node => ({
                id: node.id,
                type: node.constructor.name,
                label: node.label,
                position: [node.position.x, node.position.y, node.position.z],
                parameters: node.parameters
            })),
            edges: this.sg.graph.edges.map(edge => ({
                id: edge.id,
                source: edge.sourceNode.id,
                target: edge.targetNode.id,
                type: edge.constructor.name
            }))
        };

        return WorkflowMapper.toN8nJSON(spec);
    }

    exportGLTF(): Promise<ArrayBuffer | { [key: string]: any }> {
        return new Promise((resolve, reject) => {
            const exporter = new GLTFExporter();
            exporter.parse(
                this.sg.renderer.scene,
                (gltf) => {
                    resolve(gltf);
                },
                (error) => {
                    reject(error);
                },
                { binary: true }
            );
        });
    }

    private send(message: any) {
        if (this.wsClient && this.wsClient.readyState === 1) { // 1 = WebSocket.OPEN
            this.wsClient.send(JSON.stringify(message));
            } else {
                log.warn('WebSocket is not open. Cannot send message:', message);
            }
    }

    // RxJS observables for reactive UI updates
    get executionState(): Observable<ExecutionState | null> { return this.executionState$.asObservable(); }
    get workflowDiffs(): Observable<N8nWorkflowDiff> { return this.workflowDiff$.asObservable(); }
    get osProcessUpdates(): Observable<OSProcessUpdate> { return this.osProcess$.asObservable(); }

    dispose(): void {
        if (this.wsClient) {
            this.wsClient.close();
        }
    }
}
