import { escapeHtml, ModelAdapter, type AdapterEdge, type AdapterModel, type AdapterNode } from '@spacegraphjs/adapter';
import type { NodeStatus, RenderEdge, RenderNode } from '@spacegraphjs/renderer';
import type { AgentView } from '@spacegraphjs/agent';
import { CARD_BUDGETS } from './policy';

export type AgentAdapterNode = AdapterNode & {
    readonly role?: string;
    readonly lane?: string;
    readonly scope?: string;
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
        scope: typeof node.data?.scope === 'string' ? node.data.scope : undefined,
    })),
    edges: view.edges.map((edge) => ({
        ...edge,
        confidence: edge.confidence ?? 'explicit',
    })),
});

const detailOf = (node: AgentAdapterNode): string => {
    const data = node.data ?? {};
    for (const key of ['text', 'summary', 'path', 'args', 'result', 'reason', 'level']) {
        if (typeof data[key] === 'string' && data[key]) return String(data[key]);
    }
    return node.summary ?? '';
};

export class AgentAdapter extends ModelAdapter<
    AgentAdapterNode,
    AgentAdapterEdge,
    AgentLevel,
    AgentAdapterModel
> {
    constructor() {
        super({
            cardBudget: (level) => CARD_BUDGETS[level],
            renderCardTemplate: (node, _level, context) => {
                const detail = escapeHtml(detailOf(node).slice(0, 160));
                return `<div data-kind="${node.kind}" data-role="${node.role ?? ''}" data-status="${node.status}" style="display:flex;flex-direction:column;gap:2px;padding:8px 10px;color:inherit;font-family:inherit"><span style="font-weight:600">${escapeHtml(node.label)}${context.count ? ` <span style="opacity:.6">${context.count}</span>` : ''}</span><span style="opacity:.72;font-size:11px">${detail}</span></div>`;
            },
        });
    }

    nodeShape(node: AgentAdapterNode): RenderNode['shape'] {
        if (node.scope) return 'group';
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
        return { role: node.role, lane: node.lane, scope: node.scope, dimmed };
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
            style: edge.kind === 'contains' ? 'solid' : 'dashed',
            emphasis: edge.kind === 'writes' || edge.kind === 'delegates' ? 0.8 : 0.3,
        };
    }
}
