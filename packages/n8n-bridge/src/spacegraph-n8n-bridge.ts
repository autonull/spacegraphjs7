import { Subject, BehaviorSubject, Observable } from 'rxjs';
import type { SpaceGraph } from 'spacegraphjs';
import { WorkflowMapper } from './WorkflowMapper';
import type { N8nWorkflowJSON, N8nWorkflowDiff, ExecutionState } from './types';

export class N8nBridge {
    private sg: SpaceGraph;
    private wsClient!: WebSocket;           // connects to n8n-bridge-server
    private workflowDiff$ = new Subject<N8nWorkflowDiff>();
    private executionState$ = new BehaviorSubject<ExecutionState | null>(null);
    private serverUrl: string;

    constructor(sg: SpaceGraph, bridgeServerUrl = 'ws://localhost:5679') {
        this.sg = sg;
        this.serverUrl = bridgeServerUrl;
        this.connect();
    }

    private connect() {
        this.wsClient = new WebSocket(this.serverUrl);

        this.wsClient.onopen = () => {
            console.log('[N8nBridge] Connected to server');
        };

        this.wsClient.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (e) {
                console.error('[N8nBridge] Failed to parse message', e);
            }
        };

        this.wsClient.onclose = () => {
            console.warn('[N8nBridge] Disconnected from server. Reconnecting in 5s...');
            setTimeout(() => this.connect(), 5000);
        };
    }

    private handleMessage(message: any) {
        switch (message.type) {
            case 'workflow:loaded':
                const spec = WorkflowMapper.toGraphSpec(message.data as N8nWorkflowJSON);
                this.sg.loadSpec(spec);
                break;
            case 'execution:progress':
            case 'execution:complete':
                this.executionState$.next(message.data as ExecutionState);
                break;
            case 'workflow:diff':
                this.workflowDiff$.next(message.data as N8nWorkflowDiff);
                break;
            default:
                console.warn('[N8nBridge] Unknown message type:', message.type);
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

    private send(message: any) {
        if (this.wsClient.readyState === WebSocket.OPEN) {
            this.wsClient.send(JSON.stringify(message));
        } else {
            console.warn('[N8nBridge] WebSocket is not open. Cannot send message:', message);
        }
    }

    // RxJS observables for reactive UI updates
    get executionState(): Observable<ExecutionState | null> { return this.executionState$.asObservable(); }
    get workflowDiffs(): Observable<N8nWorkflowDiff> { return this.workflowDiff$.asObservable(); }

    dispose(): void {
        if (this.wsClient) {
            this.wsClient.close();
        }
    }
}
