import { clamp01, lerp } from './math';

export const RIBBON_WIDTH_DEFAULTS = { weight: 0.5, minRadius: 1, maxRadius: 8 } as const;

const finite = (value: unknown, fallback: number): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
};

/** Resolves a ribbon width from edge data. Accepts numeric strings, a direct `width`, a
 * `[min, max]` radius tuple and a named `widthCurve`; malformed values fall back instead of
 * emitting NaN geometry. Plain numeric data produces the same width as before. */
export const ribbonWidth = (
    data: Readonly<Record<string, unknown>> | undefined,
    defaults = RIBBON_WIDTH_DEFAULTS,
): number => {
    const direct = finite(data?.width, NaN);
    if (Number.isFinite(direct)) return Math.max(0, direct);

    const radius = data?.radius;
    const min = Math.max(
        0,
        finite(Array.isArray(radius) ? radius[0] : data?.minRadius, defaults.minRadius),
    );
    const max = Math.max(
        min,
        finite(Array.isArray(radius) ? radius[1] : data?.maxRadius, defaults.maxRadius),
    );
    const weight = clamp01(finite(data?.weight, defaults.weight));
    const shaped =
        data?.widthCurve === 'sqrt'
            ? Math.sqrt(weight)
            : data?.widthCurve === 'smoothstep'
              ? weight * weight * (3 - 2 * weight)
              : weight;
    return lerp(min, max, shaped);
};
