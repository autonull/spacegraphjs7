import type { PolicyVector } from './schema';

/** One octave is a 2× zoom change. The target reuses policy knobs; it adds no permalink field. */
export const FIT_OCTAVES = [-1, 0, 1] as const;
export const FIT_LABEL_BASE_PX = 20;

/** Phase 0 measured coverage for the fit-wide shots (`presence-baseline.json`). The far octave is
 * absent on purpose: topology stays sparse and is never packed toward a mid/near target. */
export const PRESENCE_OCCUPANCY: Readonly<Record<number, number>> = {
    0: 0.0652,
    1: 0.0881,
};

export interface FitInsets {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
}

export interface FitMetrics {
    readonly aspect: number;
    readonly insets: FitInsets;
    readonly octaves: readonly number[];
    readonly minLabelPx: number;
}

/** CSS-px insets from the canvas aspect: the short side sets the margin, narrow canvases bias vertically. */
export const adaptiveInsets = (width: number, height: number, padding: number): FitInsets => {
    const short = Math.min(width, height);
    const margin = Math.min(short * 0.05, Math.max(short * 0.02, padding * 0.25));
    const lateral = width >= height ? margin : margin * 0.5;
    return { top: margin, bottom: margin, left: lateral, right: lateral };
};

export const fitMetrics = (
    width: number,
    height: number,
    padding: number,
    values: PolicyVector,
): FitMetrics => ({
    aspect: width / Math.max(height, 1),
    insets: adaptiveInsets(width, height, padding),
    octaves: FIT_OCTAVES,
    minLabelPx: Number(values['ladder.minLabelPx']),
});

/** A material aspect change is at least a quarter octave (~19%); smaller resizes keep the user's view. */
export const aspectChanged = (from: number, to: number): boolean =>
    from > 0 && to > 0 && Math.abs(Math.log2(to / from)) >= 0.25;
