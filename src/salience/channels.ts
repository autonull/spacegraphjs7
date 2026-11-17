// P2.2/P2.3. The renderer contract carries an additive `emphasis` score; this registry maps that
// score onto host-chosen visual channels. A backend that ignores the channels renders as before.

import type { EmphasisChannel, RenderEdge, RenderModel, RenderNode } from '@spacegraphjs/renderer';

/** Endpoints of a channel's range, interpolated at emphasis 0 and 1. */
export type EmphasisRange = readonly [from: number, to: number];

/** Only the named channels are written; absent channels are left untouched. */
export type EmphasisMapping = Partial<Record<EmphasisChannel, EmphasisRange>>;

/** Starting ranges; hosts override any subset. */
export const EMPHASIS_RANGES: Readonly<Record<EmphasisChannel, EmphasisRange>> = {
    size: [0.85, 1.6],
    opacity: [0.5, 1],
    lift: [0, 1],
    glow: [0, 1],
    edgeThickness: [1, 4],
    labelDensity: [0, 1],
    saturation: [0, 1],
    motion: [0, 1],
};

export function mappingFor(
    channels: readonly EmphasisChannel[],
    overrides: EmphasisMapping = {},
): EmphasisMapping {
    return Object.fromEntries(
        channels.map((channel) => [channel, overrides[channel] ?? EMPHASIS_RANGES[channel]]),
    );
}

const at = (range: EmphasisRange | undefined, value: number) =>
    range ? range[0] + (range[1] - range[0]) * value : undefined;

/** Apply a mapping to one node; `emphasis` is always carried so a backend may add its own channel. */
export function applyEmphasis(
    node: RenderNode,
    emphasis: number,
    mapping: EmphasisMapping,
): RenderNode {
    const size = node.size?.map((dimension) => dimension * (at(mapping.size, emphasis) ?? 1)) as
        | RenderNode['size']
        | undefined;
    const data: Record<string, unknown> = { ...node.data };
    for (const channel of ['opacity', 'lift', 'glow', 'labelDensity', 'saturation', 'motion'] as const) {
        const value = at(mapping[channel], emphasis);
        if (value !== undefined) data[channel] = value;
    }
    return { ...node, emphasis, ...(size ? { size } : {}), ...(Object.keys(data).length ? { data } : {}) };
}

/** Edges inherit the louder endpoint so a causal ribbon is as loud as what it connects. */
export function applyEdgeEmphasis(
    edge: RenderEdge,
    emphasis: number,
    mapping: EmphasisMapping,
): RenderEdge {
    const data: Record<string, unknown> = { ...edge.data };
    for (const channel of ['edgeThickness', 'opacity', 'glow', 'labelDensity'] as const) {
        const value = at(mapping[channel], emphasis);
        if (value !== undefined) data[channel === 'edgeThickness' ? 'thickness' : channel] = value;
    }
    return { ...edge, emphasis, ...(Object.keys(data).length ? { data } : {}) };
}

/** Map a salience score map onto a whole model without changing its shape or node ids. */
export function applyModelEmphasis(
    model: RenderModel,
    values: ReadonlyMap<string, number>,
    mapping: EmphasisMapping,
): RenderModel {
    return {
        ...model,
        nodes: model.nodes.map((node) => applyEmphasis(node, values.get(node.id) ?? 0, mapping)),
        edges: model.edges.map((edge) =>
            applyEdgeEmphasis(edge, Math.max(values.get(edge.source) ?? 0, values.get(edge.target) ?? 0), mapping),
        ),
    };
}
