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

/** Rank × salience sets ribbon width; context edges stay thin and dim without a ribbon. */
export const applyEdgeAttention = (
    edge: RenderEdge,
    salience: number,
    policy: AttentionPolicy,
): RenderEdge => {
    const rank = edgeRank(edge.kind);
    const weight = rank * (0.45 + 0.55 * salience);
    const ribbon =
        policy.ribbonWidth > 0 &&
        policy.ribbonKinds !== 'none' &&
        (policy.ribbonKinds === 'all' || CAUSAL_KINDS.has(edge.kind))
            ? {
                  weight,
                  minRadius: policy.ribbonWidth * 0.15,
                  maxRadius: policy.ribbonWidth,
                  segments: 3,
              }
            : undefined;
    const mapped = applyEdgeEmphasis(edge, salience, attentionMapping(policy.salienceSize));
    return {
        ...mapped,
        confidence: rank < 0.5 ? 'inferred' : edge.confidence,
        data: { ...mapped.data, ...(ribbon ? { ribbon } : {}) },
    };
};
