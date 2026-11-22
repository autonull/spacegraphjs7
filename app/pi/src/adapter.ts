import {
    ModelAdapter,
    type AdapterEdge,
    type AdapterModel,
    type AdapterNode,
    type CardContext,
} from '@spacegraphjs/adapter';
import type { NodeStatus, RenderEdge, RenderNode } from '@spacegraphjs/renderer';
import type { AgentView } from '@spacegraphjs/agent';
import type { RepresentationLayer, RepresentationRung } from 'spacegraphjs/salience';
import { anatomyCard, anatomyLens, portalGlyph } from './anatomy';
import type { InnerChip, InnerLayout } from './inner';
import { CARD_BUDGETS } from './policy';

export { portalGlyph } from './anatomy';

export type AgentAdapterNode = AdapterNode & {
    readonly role?: string;
    readonly lane?: string;
    readonly scope?: string;
    readonly focusRole?: string;
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

/** Cards and dots share a kind vocabulary but not a footprint scale; dense cards pack tighter. */
export const nodeSize = (
    kind: string,
    card: boolean,
    dense = false,
): readonly [number, number] => {
    const size = (card ? CARD_SIZES[kind] : DOT_SIZES[kind]) ?? [12, 12];
    return card && dense ? [size[0], Math.round(size[1] * 0.92)] : size;
};

/** Host-registered card templates keyed by kind; the default ladder stays the fallback. */
export type CardTemplate = (
    node: AgentAdapterNode,
    rung: AgentLevel,
    context: CardContext,
    blend?: number,
    descending?: boolean,
    labelPx?: number,
) => string;
const cardTemplates = new Map<string, CardTemplate>();
export const registerCardTemplate = (kind: string, template: CardTemplate): void => {
    cardTemplates.set(kind, template);
};
export const cardTemplateFor = (kind: string): CardTemplate => cardTemplates.get(kind) ?? cardMarkup;

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

/** A bounded miniature of a child scope, derived from ScopeSpec rather than the portal's label. */
export const portalPreview = (
    scope: string,
    specs: readonly { readonly id: string; readonly nodes: readonly { readonly kind?: string; readonly scope?: string }[] }[],
): string =>
    (specs.find((spec) => spec.id === scope)?.nodes ?? [])
        .slice(0, 4)
        .map((node) => portalGlyph(node.scope ?? node.kind ?? 'action'))
        .join('');

/** Host-owned markup for one rung of the representation ladder. All node text is escaped. */
export const cardMarkup = (
    node: AgentAdapterNode,
    rung: AgentLevel,
    context: CardContext,
    blend = 0,
    descending = false,
    labelPx = 0,
): string => {
    const custom = cardTemplates.get(node.kind);
    if (custom) return custom(node, rung, context, blend, descending, labelPx);
    return anatomyCard(node, rung, context, blend, descending, labelPx);
};

/** The focused detail rung becomes a cockpit: structured data, a bounded inner layout, and actions. */
export const focusCardMarkup = (
    node: AgentAdapterNode,
    chips: readonly InnerChip[],
    layout: InnerLayout,
    labelPx = 0,
): string => anatomyLens(node, chips, layout, labelPx);

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
        return {
            role: node.role,
            lane: node.lane,
            scope: node.scope,
            dimmed,
            ...(node.kind === 'artifact' ? { shape: 'ring' } : {}),
        };
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
            emphasis: edge.kind === 'writes' || edge.kind === 'delegates' ? 0.45 : 0.3,
        };
    }
}
