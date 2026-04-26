export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
export const PI = Math.PI;
export const TAU = Math.PI * 2;
export const EPSILON = 1e-6;

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(value, max));
export const clamp01 = (value: number): number => clamp(value, 0, 1);
export const lerp = (start: number, end: number, t: number): number => start + (end - start) * t;
export const lerpClamped = (start: number, end: number, t: number): number => lerp(start, end, clamp01(t));
export const inverseLerp = (start: number, end: number, value: number): number => end === start ? 0 : (value - start) / (end - start);

export const isObject = (item: unknown): item is Record<string, unknown> =>
    item !== null && typeof item === 'object' && !Array.isArray(item);

export const isFunction = (value: unknown): value is (...args: unknown[]) => unknown =>
    typeof value === 'function';

export const isString = (value: unknown): value is string => typeof value === 'string';
export const isNumber = (value: unknown): value is number => typeof value === 'number' && !isNaN(value);
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
export const isArray = <T>(value: unknown): value is T[] => Array.isArray(value);
export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    isObject(value) && Object.getPrototypeOf(value) === Object.prototype;

export function mergeDeep<T extends Record<string, unknown>>(target: T, ...sources: Partial<T>[]): T {
    for (const source of sources) {
        if (!source) continue;
        for (const key in source) {
            const targetValue = target[key];
            const sourceValue = source[key];
            target[key] = isObject(targetValue) && isObject(sourceValue)
                ? mergeDeep(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>) as T[Extract<keyof T, string>]
                : sourceValue as T[Extract<keyof T, string>];
        }
    }
    return target;
}

export const randomRange = (min: number, max: number): number => Math.random() * (max - min) + min;
export const randomInt = (min: number, max: number): number => Math.floor(randomRange(min, max + 1));
export const randomBool = (): boolean => Math.random() > 0.5;
export const randomPick = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)];

export const smoothstep = (edge0: number, edge1: number, x: number): number => { const t = clamp((x - edge0) / (edge1 - edge0), 0, 1); return t * t * (3 - 2 * t); };
export const smootherstep = (edge0: number, edge1: number, x: number): number => { const t = clamp((x - edge0) / (edge1 - edge0), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
export const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number =>
    inMax === inMin ? outMin : ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

export const round = (value: number, decimals = 0): number => {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
};

export const approx = (a: number, b: number, epsilon = EPSILON): boolean => Math.abs(a - b) < epsilon;
export const sign = (value: number): number => (value > 0 ? 1 : value < 0 ? -1 : 0);
export const abs = (value: number): number => Math.abs(value);
export const min = (...values: number[]): number => Math.min(...values);
export const max = (...values: number[]): number => Math.max(...values);
export const sum = (...values: number[]): number => values.reduce((a, b) => a + b, 0);
export const mean = (...values: number[]): number => values.length ? sum(...values) / values.length : 0;

export function safeClone<T>(obj: T): T {
    if (obj == null) return obj;
    try { return structuredClone(obj); } catch { return JSON.parse(JSON.stringify(obj)); }
}

export function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    if (isArray(a) && isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((item, i) => deepEqual(item, b[i]));
    }
    if (isObject(a) && isObject(b)) {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
    }
    return false;
}

export function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number,
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

export function throttle<T extends (...args: unknown[]) => void>(
    fn: T,
    limit: number,
): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            fn(...args);
        }
    };
}
