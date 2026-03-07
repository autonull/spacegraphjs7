import type { GraphSpec } from 'spacegraphjs';

export interface N8nNodeSpec {
    parameters: Record<string, any>;
    name: string;
    type: string;
    typeVersion: number;
    position: [number, number];
    id: string;
    notes?: string;
    credentials?: Record<string, any>;
    webhookId?: string;
    disabled?: boolean;
}

export interface N8nConnectionSpec {
    [nodeName: string]: {
        [outputName: string]: Array<Array<{
            node: string;
            type: string;
            index: number;
        }>>;
    };
}

export interface N8nWorkflowJSON {
    name: string;
    nodes: N8nNodeSpec[];
    connections: N8nConnectionSpec;
    active: boolean;
    settings: Record<string, any>;
    id: string;
    tags: Array<{
        createdAt: string;
        updatedAt: string;
        id: string;
        name: string;
    }>;
}

export interface N8nWorkflowDiff {
    addedNodes: N8nNodeSpec[];
    removedNodes: string[];
    updatedNodes: Partial<N8nNodeSpec>[];
    addedEdges: Array<any>;
    removedEdges: string[];
}

export interface ExecutionState {
    executionId: string;
    status: 'waiting' | 'running' | 'success' | 'error' | 'skipped';
    nodeId?: string;
    error?: any;
}

export interface OSProcessUpdate {
    pid: string;
    name: string;
    status: string;
    cpu: number;
    memory: number;
}
