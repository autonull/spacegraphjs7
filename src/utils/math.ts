// math.ts - Modern ES2022+ math and utility functions
// Type-safe, performant, and deduplicated
export { DEG2RAD, EPSILON, PI, RAD2DEG, TAU } from '../core/constants';

// ============= Math Functions =============
export const clamp = (v: number, min: number, max: number): number =>
    Math.max(min, Math.min(v, max));
export const clamp01 = (v: number): number => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// ============= Random Utilities =============
const LCG_MULTIPLIER = 1103515245;
const LCG_INCREMENT = 12345;

/** Deterministic 32-bit LCG used by reproducible samplers and generators. */
export const seededRandom = (seed: number): (() => number) => {
    let value = seed >>> 0;
    return () => (value = (value * LCG_MULTIPLIER + LCG_INCREMENT) >>> 0) / 0x1_0000_0000;
};

/** 31-bit LCG variant that keeps the historical output of the graph generators. */
export const seededRandom31 = (seed: number): (() => number) => {
    let value = seed;
    return () => (value = (value * LCG_MULTIPLIER + LCG_INCREMENT) & 0x7fffffff) / 0x7fffffff;
};

// ============= Object Utilities =============
export function safeClone<T>(obj: T): T {
    if (obj == null) return obj;
    try {
        return structuredClone(obj);
    } catch {
        return JSON.parse(JSON.stringify(obj));
    }
}
