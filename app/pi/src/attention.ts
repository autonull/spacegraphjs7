import type { RenderEdge, RenderNode } from '@spacegraphjs/renderer';
import {
    applyEdgeEmphasis,
    applyEmphasis,
    mappingFor,
    type EmphasisMapping,
} from 'spacegraphjs/salience';

export type RibbonKinds = 'causal' | 'all' | 'none';

export interface AttentionPolicy {
    readonly salienceSize: number;
    readonly ribbonWidth: number;
    readonly ribbonKinds: RibbonKinds;
    readonly glow: number;
}

const EDGE_RANK: Readonly<Record<string, number>> = {
    writes: 1,
    delegates: 1,
    orders: 1,
    contains: 0.6,
    reads: 0.25,
    evidence: 0.25,
};

const CAUSAL_KINDS = new Set(['writes', 'delegates', 'orders']);

export const edgeRank = (kind: string): number => EDGE_RANK[kind] ?? 0.2;

export const salienceScore = (activity: number, emphasis = 0): number =>
    Math.min(1, Math.max(0, Math.max(activity, emphasis)));

/** One mapping owns the salience channels; policy only chooses their bounds. */
export const attentionMapping = (salienceSize: number): EmphasisMapping =>
    mappingFor(['size', 'opacity', 'edgeThickness'], {
        size: [1, salienceSize],
        opacity: [0.78, 1],
        edgeThickness: [1, 3],
    });

/** Salience is scored once; focus scaling is an independent, opt-in multiplier on the same size. */
export const applyNodeAttention = (
    node: RenderNode,
    size: readonly [number, number],
    salience: number,
    policy: AttentionPolicy,
    focusScale = 1,
): RenderNode => {
    const mapped = applyEmphasis(
        { ...node, size: [size[0], size[1], 0] },
        salience,
        attentionMapping(policy.salienceSize),
    );
    const scaled = mapped.size?.map((dimension: number) => dimension * focusScale) as RenderNode['size'];
    return { ...mapped, size: scaled };
};

/**
 * Cross-scope causal edges keep their relation but carry a stable source-scope tint instead of the
 * single causal color, so a filament crossing unrelated cards stays traceable to its origin.
 */
export const crossScopeTint = (
    edge: RenderEdge,
    sourceScope: string | undefined,
    targetScope: string | undefined,
    colors: readonly string[],
): RenderEdge => {
    const ribbon = edge.data?.ribbon;
    if (!sourceScope || !targetScope || sourceScope === targetScope || !colors.length) return edge;
    if (!ribbon || typeof ribbon !== 'object' || !('color' in ribbon)) return edge;
    const index = [...sourceScope].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length;
    return {
        ...edge,
        data: { ...edge.data, crossScope: sourceScope, ribbon: { ...ribbon, color: colors[index] } },
    };
};

/** Rank × salience sets flux width. Context edges stay thin filaments, never bare sticks. */
export const applyEdgeAttention = (
    edge: RenderEdge,
    salience: number,
    policy: AttentionPolicy,
    causalColor?: string,
): RenderEdge => {
    const rank = edgeRank(edge.kind);
    const weight = rank * (0.45 + 0.55 * salience);
    const causal = CAUSAL_KINDS.has(edge.kind);
    const ribbon =
        policy.ribbonWidth > 0 && policy.ribbonKinds !== 'none'
            ? {
                  weight,
                  minRadius: policy.ribbonWidth * (causal ? 0.15 : 0.1),
                  maxRadius:
                      policy.ribbonWidth *
                      (policy.ribbonKinds === 'all' || causal ? 1 : 0.5),
                  segments: 3,
                  fluid: true,
                  curve: causal ? 0.14 : 0.06,
                  inset: 0.14,
                  halo: policy.glow,
                  ...(causal && causalColor ? { color: causalColor } : {}),
              }
            : undefined;
    const mapped = applyEdgeEmphasis(edge, salience, attentionMapping(policy.salienceSize));
    return {
        ...mapped,
        confidence: rank < 0.5 ? 'inferred' : edge.confidence,
        data: {
            ...mapped.data,
            ...(causal ? { arrowhead: 'target' } : {}),
            ...(ribbon ? { ribbon } : {}),
        },
    };
};
