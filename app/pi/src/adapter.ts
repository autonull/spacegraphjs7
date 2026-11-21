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
import type { RepresentationLayer, RepresentationRung } from 'spacegraphjs/salience';
import { CARD_BUDGETS } from './policy';

export type AgentAdapterNode = AdapterNode & {
    readonly role?: string;
    readonly lane?: string;
    readonly scope?: string;
    readonly data?: Readonly<Record<string, unknown>>;
};
export type AgentAdapterEdge = AdapterEdge;
export type AgentAdapterModel = AdapterModel<AgentAdapterNode, AgentAdapterEdge>;
export type AgentLevel = RepresentationRung;

const CARD_SIZES: Readonly<Record<string, readonly [number, number]>> = {
    run: [320, 110],
    unit: [260, 100],
    message: [240, 90],
    artifact: [190, 72],
    file: [190, 72],
    tool: [178, 68],
    'read-tool': [178, 68],
    action: [178, 68],
    error: [200, 76],
    approval: [210, 80],
};

const DOT_SIZES: Readonly<Record<string, readonly [number, number]>> = {
    artifact: [48, 48],
    file: [32, 32],
    tool: [24, 24],
    'read-tool': [24, 24],
    action: [24, 24],
    error: [28, 28],
};

/** Cards and dots share a kind vocabulary but not a footprint scale. */
export const nodeSize = (kind: string, card: boolean): readonly [number, number] =>
    (card ? CARD_SIZES[kind] : DOT_SIZES[kind]) ?? [12, 12];

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

const PORTAL_GLYPHS = ['▣', '▤', '▥', '▦'] as const;

/** A stable glyph per child scope, so a portal keeps the same identity across rungs and rebuilds. */
export const portalGlyph = (scope: string): string =>
    PORTAL_GLYPHS[[...scope].reduce((sum, char) => sum + char.charCodeAt(0), 0) % PORTAL_GLYPHS.length]!;

/** Host-owned markup for one rung of the representation ladder. All node text is escaped. */
export const cardMarkup = (
    node: AgentAdapterNode,
    rung: AgentLevel,
    context: CardContext,
    blend = 0,
    descending = false,
    labelPx = 0,
): string => {
    const label = escapeHtml(node.label);
    const detail = escapeHtml(detailOf(node));
    const status = escapeHtml(node.status);
    const badge = context.count ? ` <span style="opacity:.6">${context.count}</span>` : '';
    const portal = node.scope
        ? ` data-portal="${escapeHtml(node.scope)}"`
        : '';
    const glyph = node.scope
        ? `<span aria-hidden="true" style="opacity:.7">${portalGlyph(node.scope)} </span>`
        : '';
    const attributes = `data-rung="${rung}" data-blend="${blend.toFixed(2)}" data-kind="${escapeHtml(node.kind)}" data-status="${status}"${portal}${descending ? ' data-descending="true"' : ''}`;
    const box = 'display:flex;flex-direction:column;justify-content:center;gap:4px;padding:6% 8%;box-sizing:border-box;height:100%;color:inherit;font-family:inherit;overflow:hidden;transition:opacity var(--pi-blend,120ms)';

    if (rung === 'overview') {
        const labelSize = labelPx || 44;
        return `<div ${attributes} style="${box}"><span style="font-size:${labelSize}px;font-weight:700;line-height:1;letter-spacing:-0.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%"><span aria-hidden="true" style="font-size:${Math.round(labelSize * 0.6)}px">${glyph}</span>${label}</span></div>`;
    }
    if (rung === 'execution') {
        const bars = [0.3, 0.55, 0.8, 0.5, 0.95]
            .map((height) => `<i style="display:inline-block;width:5px;height:${Math.round(height * 22)}px;background:currentColor;opacity:.55"></i>`)
            .join('');
        const labelSize = labelPx || 26;
        return `<div ${attributes} style="${box}"><span style="font-size:${labelSize}px;font-weight:700;line-height:1.1;letter-spacing:-0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${glyph}${label}${badge}</span><span style="display:flex;align-items:flex-end;gap:3px;height:22px">${bars}</span><span style="opacity:.72;font-size:${Math.max(12, labelSize * 0.6)}px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${detail.slice(0, 80)}</span></div>`;
    }
    const scope = node.scope
        ? `<span style="opacity:.7;font-size:13px">${portalGlyph(node.scope)} scope: ${escapeHtml(node.scope)}</span>`
        : '';
    return `<div ${attributes} style="${box}"><span style="font-size:${labelPx || 20}px;font-weight:700;line-height:1.15">${glyph}${label}${badge}</span><span style="opacity:.78;font-size:15px;line-height:1.35;overflow:hidden">${detail.slice(0, 320)}</span><span style="opacity:.6;font-size:13px">${escapeHtml(node.kind)} · ${status} · reveal / follow / trace</span>${scope}</div>`;
};

/**
 * True two-rung compositing: both neighbouring rungs stay in the DOM with normalized opacities and
 * crossfade in place. Node ids, glyphs and positions are unchanged — only the card's interior swaps.
 */
export const composedCardMarkup = (
    node: AgentAdapterNode,
    layers: readonly RepresentationLayer[],
    context: CardContext,
    descending = false,
    labelPx = 0,
): string => {
    const primary = layers.at(-1);
    const secondary = layers.at(-2);
    if (!secondary) return cardMarkup(node, primary?.rung ?? 'overview', context, 0, descending, labelPx);
    const layer = ({ rung, opacity }: RepresentationLayer, lower: boolean): string =>
        `<div data-layer="${rung}" style="position:absolute;inset:0;opacity:${opacity.toFixed(3)};transition:opacity var(--pi-blend,120ms)${lower ? ';pointer-events:none' : ''}">${cardMarkup(node, rung, context, 0, descending, labelPx)}</div>`;
    return `<div data-rungs="${secondary.rung}+${primary!.rung}" style="position:relative;min-height:56px">${layer(secondary, true)}${layer(primary!, false)}</div>`;
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
            style:
                edge.kind === 'contains' || edge.kind === 'writes' || edge.kind === 'delegates'
                    ? 'solid'
                    : edge.kind === 'reads' || edge.kind === 'evidence'
                      ? 'dotted'
                      : 'dashed',
            emphasis: edge.kind === 'writes' || edge.kind === 'delegates' ? 0.8 : 0.3,
        };
    }
}
