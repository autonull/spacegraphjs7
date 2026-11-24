import type { ScopeNode } from 'pi-kit';
import { ScaleDomain, type ScaleSample } from 'spacegraphjs/zoom';
import { RUNGS, type Rung } from './rungs';

export const ZOOM_RANGE = { min: 0.25, max: 4, closerIsLarger: true } as const;

export type AttentionTarget = {
    readonly id?: string;
    readonly kind: string;
    readonly data?: Readonly<Record<string, unknown>>;
};

const KIND_RANK: Readonly<Record<string, number>> = {
    conversation: 0, run: 0, boundary: 0, task: 0, fork: 0,
    message: 1, action: 1,
    pending: 2, artifact: 2, config: 2, state: 2,
};

const TIER_BIAS = { hero: 0.08, medium: 0, compact: -0.08 } as const;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Landmarks are samples of one scale; zoom interpolates between them. */
export const createScaleDomain = (): ScaleDomain =>
    new ScaleDomain({
        stops: RUNGS.map((rung, index) => ({
            at: index / (RUNGS.length - 1),
            id: rung.id,
            label: rung.label,
            importance: index / (RUNGS.length - 1),
            transitionDuration: 0.18,
        })),
        range: ZOOM_RANGE,
        hysteresis: 0.03,
    });

export const sampleForRung = (domain: ScaleDomain, rung: Rung): ScaleSample =>
    domain.sample(RUNGS.findIndex((entry) => entry.id === rung) / (RUNGS.length - 1));

/** Attention grades a committed node; it never removes it or changes its edges. */
export const attentionFor = (node: AttentionTarget, sample: ScaleSample, focus?: string): number => {
    if (node.id && node.id === focus) return 1;
    const rank = KIND_RANK[node.kind] ?? 1;
    const declared = node.data?.['importance'];
    const tier = declared === 'hero' || declared === 'medium' || declared === 'compact'
        ? declared
        : rank === 0 ? 'hero' : rank === 2 ? 'compact' : 'medium';
    const proximity = 1 - Math.abs(sample.position - rank) / (RUNGS.length - 1);
    const detail = rank === 2 ? sample.importance * 0.1 : -sample.importance * 0.05;
    return clamp01(proximity + TIER_BIAS[tier] + detail);
};

export const attentionWeights = (
    nodes: readonly AttentionTarget[],
    sample: ScaleSample,
    focus?: string,
): ReadonlyMap<string, number> =>
    new Map(nodes.flatMap((node) => (node.id ? [[node.id, attentionFor(node, sample, focus)] as const] : [])));
