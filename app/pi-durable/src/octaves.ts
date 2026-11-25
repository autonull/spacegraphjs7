import type { ScaleSample } from 'spacegraphjs/zoom';
import { attentionFor, type AttentionTarget } from './attention';

export const OCTAVE_MIN = 0;
export const OCTAVE_MAX = 6;
export const OCTAVE_UNIT = 8;
export const OCTAVE_SHIFT = 1.5;
export const FOCUS_OCTAVE = 3;

export type OctaveBand = 'dot' | 'chip' | 'card' | 'panel' | 'monument';

export type OctaveTarget = AttentionTarget & {
    readonly role?: string;
};

/** Base octave of each committed role. Intermediate roles interpolate through these anchors. */
const ROLE_OCTAVE: Readonly<Record<string, number>> = {
    conversation: 5, answer: 5, boundary: 5, fork: 5,
    run: 4, task: 4,
    message: 3.5, action: 3.5, state: 3.5, user: 3.5, assistant: 3.5, 'nested call': 3.5,
    artifact: 2, config: 2, doc: 2, plate: 2, image: 2,
    pending: 1, signal: 1, trace: 1, span: 1,
};

const TIER_OCTAVE: Readonly<Record<string, number>> = { hero: 0.5, medium: 0, compact: -0.5 };

export const clampOctave = (octave: number): number =>
    Math.min(OCTAVE_MAX, Math.max(OCTAVE_MIN, octave));

/** One size authority: every rendered footprint is a point on the same power-of-two ladder. */
export const sizeForOctave = (octave: number): readonly [number, number] => {
    const width = Math.min(512, Math.max(OCTAVE_UNIT, Math.round(OCTAVE_UNIT * 2 ** clampOctave(octave))));
    const height = width <= OCTAVE_UNIT * 2 ? width : Math.max(OCTAVE_UNIT, Math.round(width * 0.45));
    return [width, height];
};

export const bandForOctave = (octave: number): OctaveBand =>
    octave <= 1 ? 'dot' : octave < 3 ? 'chip' : octave < 4 ? 'card' : octave < 5 ? 'panel' : 'monument';

/** Centrality is shared by both attention projections; it rises toward the cosmos landmark. */
const centralityOf = (sample: ScaleSample): number =>
    (sample.importance + 1 - sample.position) / 2;

const baseOctave = (node: OctaveTarget): number => {
    const role = node.role ?? node.kind;
    const declared = node.data?.['importance'];
    const tier = typeof declared === 'string' ? TIER_OCTAVE[declared] ?? 0 : 0;
    return (ROLE_OCTAVE[role] ?? 3) + tier;
};

/** Committed role sets the base; the attention sample shifts it continuously within one ladder. */
export const octaveFor = (node: OctaveTarget, sample: ScaleSample, focus?: string): number => {
    const shift = (centralityOf(sample) - 0.5) * OCTAVE_SHIFT * 2;
    const attention = attentionFor(node, sample, focus);
    const octave = clampOctave(
        baseOctave(node) + shift * (0.5 + attention) + (attention - 0.5) * 0.75,
    );
    return node.id && node.id === focus ? Math.max(FOCUS_OCTAVE, octave) : octave;
};
