// math.ts - Modern ES2022+ math and utility functions
// Type-safe, performant, and deduplicated

// ============= Constants =============
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
export const PI = Math.PI;
export const TAU = PI * 2;
export const EPSILON = 1e-6;

// ============= Type Guards =============
export const isObject = (item: unknown): item is Record<string, unknown> =>
    item !== null && typeof item === 'object' && !Array.isArray(item);

export const isFunction = (value: unknown): value is (...args: unknown[]) => unknown =>
    typeof value === 'function';

export const isString = (value: unknown): value is string => typeof value === 'string';
export const isNumber = (value: unknown): value is number =>
    typeof value === 'number' && !isNaN(value);
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
export const isArray = <T>(value: unknown): value is T[] => Array.isArray(value);
export const isPlainObject = (item: unknown): item is Record<string, unknown> =>
    isObject(item) && Object.getPrototypeOf(item) === Object.prototype;

// ============= Math Functions =============
export const clamp = (v: number, min: number, max: number): number =>
    Math.max(min, Math.min(v, max));
export const clamp01 = (v: number): number => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerpClamped = (a: number, b: number, t: number): number => lerp(a, b, clamp01(t));
export const inverseLerp = (a: number, b: number, v: number): number =>
    b === a ? 0 : (v - a) / (b - a);
export const smoothstep = (e0: number, e1: number, x: number): number => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
};
export const smootherstep = (e0: number, e1: number, x: number): number => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (t * (t * 6 - 15) + 10);
};
export const mapRange = (
    v: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number,
): number =>
    inMax === inMin ? outMin : ((v - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
export const round = (v: number, decimals = 0): number => {
    const f = 10 ** decimals;
    return Math.round(v * f) / f;
};
export const approx = (a: number, b: number, ε = EPSILON): boolean => Math.abs(a - b) < ε;
export const sign = (v: number): number => (v > 0 ? 1 : v < 0 ? -1 : 0);
export const abs = Math.abs;
export const min = (...vs: number[]): number => Math.min(...vs);
export const max = (...vs: number[]): number => Math.max(...vs);
export const sum = (...vs: number[]): number => vs.reduce((a, b) => a + b, 0);
export const mean = (...vs: number[]): number => (vs.length ? sum(...vs) / vs.length : 0);

// ============= Vector Math =============
export const lerp3 = (a: [number, number, number], b: [number, number, number], t: number) =>
    [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)] as [number, number, number];

export const min3 = (v: [number, number, number]): number => Math.min(v[0], v[1], v[2]);
export const max3 = (v: [number, number, number]): number => Math.max(v[0], v[1], v[2]);
export const clamp180 = (angle: number): number => {
    angle = angle % 360;
    return angle > 180 ? angle - 360 : angle < -180 ? angle + 360 : angle;
};
export const angleDiff = (a: number, b: number): number => {
    let diff = b - a;
    diff = ((diff + 180) % 360) - 180;
    return diff < 0 ? -diff : diff;
};
export const randomThreeVector = (): [number, number, number] => [
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
];

// ============= Random Utilities =============
export const randomRange = (min: number, max: number): number => Math.random() * (max - min) + min;
export const randomInt = (min: number, max: number): number =>
    Math.floor(randomRange(min, max + 1));
export const randomBool = (): boolean => Math.random() > 0.5;
export const randomPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ============= Color Conversions =============
export function hexToRgb(hex: string | number): { r: number; g: number; b: number } {
    const num = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex;
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
    };
}

export function rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function toHexColor(color: string | number): string {
    if (typeof color === 'number') {
        return `#${color.toString(16).padStart(6, '0')}`;
    }
    return color.startsWith('#') ? color : `#${color}`;
}

// ============= Object Utilities =============
export function mergeDeep<T extends Record<string, unknown>>(
    target: T,
    ...sources: Partial<T>[]
): T {
    for (const source of sources) {
        if (!source) continue;
        for (const key in source) {
            const tv = target[key];
            const sv = source[key];
            target[key] =
                isObject(tv) && isObject(sv)
                    ? (mergeDeep(
                          tv as Record<string, unknown>,
                          sv as Record<string, unknown>,
                      ) as T[Extract<keyof T, string>])
                    : (sv as T[Extract<keyof T, string>]);
        }
    }
    return target;
}

export function safeClone<T>(obj: T): T {
    if (obj == null) return obj;
    try {
        return structuredClone(obj);
    } catch {
        return JSON.parse(JSON.stringify(obj));
    }
}

export function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    const ta = typeof a;
    const tb = typeof b;
    if (ta !== 'object' || tb !== 'object') return ta === tb && a === b;
    const aa = Array.isArray(a);
    const ab = Array.isArray(b);
    if (aa !== ab) return false;
    if (aa) {
        const arr = a as unknown[];
        const brr = b as unknown[];
        if (arr.length !== brr.length) return false;
        return arr.every((v, i) => deepEqual(v, brr[i]));
    }
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    return ka.every((k) =>
        deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
    );
}

// ============= Function Utilities =============
export function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number,
): (...args: Parameters<T>) => void {
    let id: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (id) clearTimeout(id);
        id = setTimeout(() => fn(...args), delay);
    };
}

export function throttle<T extends (...args: unknown[]) => void>(
    fn: T,
    limit: number,
): (...args: Parameters<T>) => void {
    let last = 0;
    return (...args: Parameters<T>) => {
        const now = Date.now();
        if (now - last >= limit) {
            last = now;
            fn(...args);
        }
    };
}

// ============= Memoization =============
export function memoize<T extends (...args: unknown[]) => unknown>(fn: T): T {
    const cache = new Map<string, ReturnType<T>>();
    return ((...args: Parameters<T>) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) return cache.get(key);
        const result = fn(...args) as ReturnType<T>;
        cache.set(key, result);
        return result;
    }) as T;
}

export function memoizeWithKey<T extends (...args: unknown[]) => unknown, K = string>(
    fn: T,
    keyFn: (...args: Parameters<T>) => K,
): T {
    const cache = new Map<K, ReturnType<T>>();
    return ((...args: Parameters<T>) => {
        const key = keyFn(...args);
        if (cache.has(key)) return cache.get(key);
        const result = fn(...args) as ReturnType<T>;
        cache.set(key, result);
        return result;
    }) as T;
}

export function invalidateMemoization<T>(cache: Map<unknown, T>, key: unknown): void {
    cache.delete(key);
}

export function clearMemoization<T>(cache: Map<unknown, T>): void {
    cache.clear();
}

// ============= Array Utilities =============
export function groupBy<T, K extends string | number | symbol>(
    array: T[],
    getKey: (item: T) => K,
): Record<K, T[]> {
    const result = {} as Record<K, T[]>;
    for (const item of array) {
        const key = getKey(item);
        if (!result[key]) result[key] = [] as T[];
        result[key].push(item);
    }
    return result;
}

export function unique<T>(array: T[]): T[] {
    return Array.from(new Set(array));
}

export function flatten<T>(array: T[][]): T[] {
    return array.flat();
}

export function chunk<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

// ============= Promise Utilities =============
export function isPromise<T>(value: any): value is Promise<T> {
    return value instanceof Promise;
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
    fn: () => Promise<T>,
    options: { maxRetries?: number; delay?: number; factor?: number } = {},
): Promise<T> {
    const { maxRetries = 3, delay = 1000, factor = 2 } = options;
    let lastError: Error | null = null;

    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (i < maxRetries) {
                await sleep(delay * Math.pow(factor, i));
            }
        }
    }

    throw lastError;
}

// ============= Error Handling =============
// Re-export from error.ts for unified error handling
export { wrapError } from './error';

// ============= Type Utilities =============
export function isDefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

// ============= Functional Utilities =============
// Pipe for method chaining
export const pipe = <T>(value: T): { and: <R>(fn: (v: T) => R) => R } =>
    ({
        and: <R>(fn: (v: T) => R) => fn(value),
    }) as any;

// Compose functions right-to-left
export const compose = <Fns extends ((...args: any[]) => any)[]>(...fns: Fns) => {
    return (...args: Parameters<Fns[0]>) => {
        let result = fns[0](...args);
        for (let i = 1; i < fns.length; i++) {
            result = fns[i](result);
        }
        return result;
    };
};

// Partial application
export const partial = <T extends (...args: any[]) => any>(
    fn: T,
    ...args: Parameters<T>
): ((...args: Parameters<T>) => ReturnType<T>) => {
    return (...rest: Parameters<T>) => fn(...args, ...rest);
};

// Curry a function
export const curry = <T extends (...args: any[]) => any>(fn: T): any => {
    return (...args: any[]) => {
        if (args.length >= fn.length) return fn(...args);
        return (...more: any[]) => fn(...args, ...more);
    };
};

// Once - execute function only once
export const once = <T extends (...args: any[]) => any>(fn: T): T => {
    let called = false;
    let result: any;
    return ((...args: any[]) => {
        if (!called) {
            called = true;
            result = fn(...args);
        }
        return result;
    }) as T;
};

// Cache with TTL
export const cacheWithTTL = <T extends (...args: any[]) => any>(fn: T, ttl: number = 60000): T => {
    const cache = new Map<string, { value: any; expires: number }>();
    return ((...args: any[]) => {
        const key = JSON.stringify(args);
        const entry = cache.get(key);
        if (entry && entry.expires > Date.now()) return entry.value;
        const value = fn(...args);
        cache.set(key, { value, expires: Date.now() + ttl });
        return value;
    }) as T;
};
