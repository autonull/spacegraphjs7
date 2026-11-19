import {
    ModelAdapter,
    type AdapterEdge,
    type AdapterModel,
    type AdapterNode,
} from '@spacegraphjs/adapter';
import type { NodeStatus, RenderEdge, RenderNode } from '@spacegraphjs/renderer';
import type { AgentView } from '@spacegraphjs/agent';

export type AgentAdapterNode = AdapterNode & {
    readonly role?: string;
    readonly lane?: string;
    readonly data?: Readonly<Record<string, unknown>>;
};
export type AgentAdapterEdge = AdapterEdge;
export type AgentAdapterModel = AdapterModel<AgentAdapterNode, AgentAdapterEdge>;
export type AgentLevel = 'overview' | 'execution' | 'detail';

const STATUS: Readonly<Record<string, NodeStatus>> = {
    active: 'running',
    streaming: 'running',
    pending: 'warning',
    complete: 'success',
    settled: 'success',
    ended: 'success',
    failed: 'error',
    aborted: 'error',
};

export const toAdapterModel = (view: AgentView): AgentAdapterModel => ({
    nodes: view.nodes.map((node) => ({
        ...node,
        status: node.status ?? 'complete',
        role: typeof node.data?.role === 'string' ? node.data.role : node.kind,
        lane: typeof node.data?.lane === 'string' ? node.data.lane : 'action',
    })),
    edges: view.edges.map((edge) => ({
        ...edge,
        confidence: edge.confidence ?? 'explicit',
    })),
});

export class AgentAdapter extends ModelAdapter<
    AgentAdapterNode,
    AgentAdapterEdge,
    AgentLevel,
    AgentAdapterModel
> {
    nodeShape(node: AgentAdapterNode): RenderNode['shape'] {
        if (node.kind === 'run') return 'panel';
        if (node.kind === 'unit') return 'badge';
        if (node.kind === 'artifact') return 'dot';
        return 'card';
    }

    nodeStatus(node: AgentAdapterNode): NodeStatus {
        return STATUS[node.status] ?? 'neutral';
    }

    isStructuralKind(kind: string): boolean {
        return kind === 'run' || kind === 'unit';
    }

    nodeData(node: AgentAdapterNode, _level: AgentLevel, dimmed: boolean): Record<string, unknown> {
        return { role: node.role, lane: node.lane, dimmed };
    }

    toRenderEdge(edge: AgentAdapterEdge): RenderEdge {
        return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
            label: edge.label,
            confidence:
                edge.confidence === 'structural' || edge.confidence === 'inferred'
                    ? edge.confidence
                    : 'explicit',
            directed: true,
        };
    }
}
