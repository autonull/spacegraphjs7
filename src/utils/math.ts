// Constants
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
export const PI = Math.PI;
export const TAU = PI * 2;
export const EPSILON = 1e-6;

// Type guards
export const isObject = (item: unknown): item is Record<string, unknown> =>
  item !== null && typeof item === 'object' && !Array.isArray(item);

export const isFunction = (value: unknown): value is (...args: unknown[]) => unknown =>
  typeof value === 'function';

export const isString = (value: unknown): value is string => typeof value === 'string';
export const isNumber = (value: unknown): value is number => typeof value === 'number' && !isNaN(value);
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
export const isArray = <T>(value: unknown): value is T[] => Array.isArray(value);
export const isPlainObject = (item: unknown): item is Record<string, unknown> =>
  isObject(item) && Object.getPrototypeOf(item) === Object.prototype;

// Math utilities
export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(v, max));
export const clamp01 = (v: number): number => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerpClamped = (a: number, b: number, t: number): number => lerp(a, b, clamp01(t));
export const inverseLerp = (a: number, b: number, v: number): number => b === a ? 0 : (v - a) / (b - a);
export const smoothstep = (e0: number, e1: number, x: number): number => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
export const smootherstep = (e0: number, e1: number, x: number): number => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
export const mapRange = (v: number, inMin: number, inMax: number, outMin: number, outMax: number): number =>
  inMax === inMin ? outMin : ((v - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
export const round = (v: number, decimals = 0): number => { const f = 10 ** decimals; return Math.round(v * f) / f; };
export const approx = (a: number, b: number, ε = EPSILON): boolean => Math.abs(a - b) < ε;
export const sign = (v: number): number => (v > 0 ? 1 : v < 0 ? -1 : 0);
export const abs = Math.abs;
export const min = (...vs: number[]): number => Math.min(...vs);
export const max = (...vs: number[]): number => Math.max(...vs);
export const sum = (...vs: number[]): number => vs.reduce((a, b) => a + b, 0);
export const mean = (...vs: number[]): number => (vs.length ? sum(...vs) / vs.length : 0);

// Random utilities
export const randomRange = (min: number, max: number): number => Math.random() * (max - min) + min;
export const randomInt = (min: number, max: number): number => Math.floor(randomRange(min, max + 1));
export const randomBool = (): boolean => Math.random() > 0.5;
export const randomPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Deep merge and clone
export function mergeDeep<T extends Record<string, unknown>>(target: T, ...sources: Partial<T>[]): T {
  for (const source of sources) {
    if (!source) continue;
    for (const key in source) {
      const tv = target[key], sv = source[key];
      target[key] = isObject(tv) && isObject(sv)
        ? mergeDeep(tv as Record<string, unknown>, sv as Record<string, unknown>) as T[Extract<keyof T, string>]
        : sv as T[Extract<keyof T, string>];
    }
  }
  return target;
}

export function safeClone<T>(obj: T): T {
  if (obj == null) return obj;
  try { return structuredClone(obj); } catch { return JSON.parse(JSON.stringify(obj)); }
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  const ta = typeof a, tb = typeof b;
  if (ta !== 'object' || tb !== 'object') return ta === tb && a === b;
  const aa = Array.isArray(a), ab = Array.isArray(b);
  if (aa !== ab) return false;
  if (aa) {
    const arr = a as unknown[];
    const brr = b as unknown[];
    if (arr.length !== brr.length) return false;
    return arr.every((v, i) => deepEqual(v, brr[i]));
  }
  const ka = Object.keys(a as object), kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every(k => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

// Function utilities
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let id: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (id) clearTimeout(id);
    id = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => void>(fn: T, limit: number): (...args: Parameters<T>) => void {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= limit) { last = now; fn(...args); }
  };
}

// Memoization utilities
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
