import {
    escapeHtml,
    ModelAdapter,
    type AdapterEdge,
    type AdapterModel,
    type AdapterNode,
    type CardContext,
} from '@spacegraphjs/adapter';
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

export type RepresentationInput = {
    readonly level: AgentLevel;
    /** Decaying activity score of the node, in [0, 1]. */
    readonly activity: number;
    /** Latest vision legibility score, in [0, 1]. */
    readonly legibility: number;
};

/** Legibility gates spectacle: activity can promote a rung, poor legibility demotes it. */
export const representationRung = ({ level, activity, legibility }: RepresentationInput): AgentLevel => {
    if (level === 'overview' && activity > 0.6 && legibility >= 0.7) return 'execution';
    if (level === 'detail' && legibility < 0.5) return 'execution';
    return level;
};

/** Host-owned markup for one rung of the representation ladder. All node text is escaped. */
export const cardMarkup = (node: AgentAdapterNode, rung: AgentLevel, context: CardContext): string => {
    const label = escapeHtml(node.label);
    const detail = escapeHtml(detailOf(node));
    const status = escapeHtml(node.status);
    const badge = context.count ? ` <span style="opacity:.6">${context.count}</span>` : '';
    const attributes = `data-rung="${rung}" data-kind="${escapeHtml(node.kind)}" data-status="${status}"`;
    const box = 'display:flex;flex-direction:column;gap:3px;padding:8px 10px;color:inherit;font-family:inherit';

    if (rung === 'overview') {
        return `<div ${attributes} style="${box}"><span style="font-weight:600">${label}${badge}</span></div>`;
    }
    if (rung === 'execution') {
        const bars = [0.3, 0.55, 0.8, 0.5, 0.95]
            .map((height) => `<i style="display:inline-block;width:3px;height:${Math.round(height * 14)}px;background:currentColor;opacity:.55"></i>`)
            .join('');
        return `<div ${attributes} style="${box}"><span style="font-weight:600">${label}${badge}</span><span style="display:flex;align-items:flex-end;gap:2px;height:16px">${bars}</span><span style="opacity:.72;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${detail.slice(0, 80)}</span></div>`;
    }
    const scope = node.scope
        ? `<span style="opacity:.7;font-size:11px">scope: ${escapeHtml(node.scope)}</span>`
        : '';
    return `<div ${attributes} style="${box}"><span style="font-weight:600">${label}${badge}</span><span style="opacity:.78;font-size:12px;line-height:16px;max-height:64px;overflow:hidden">${detail.slice(0, 320)}</span><span style="opacity:.6;font-size:11px">${escapeHtml(node.kind)} · ${status} · reveal / follow / trace</span>${scope}</div>`;
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
            renderCardTemplate: cardMarkup,
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
