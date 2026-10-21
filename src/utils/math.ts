// math.ts - Modern ES2022+ math and utility functions
// Type-safe, performant, and deduplicated
import { DEG2RAD, EPSILON, PI, RAD2DEG, TAU } from '../core/constants';

export { DEG2RAD, EPSILON, PI, RAD2DEG, TAU };

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
export const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

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
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const mapRange = (
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
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

// ============= Object Utilities =============
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
    deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
  );
}

// ============= Function Utilities =============
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let id: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (id) clearTimeout(id);
    id = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
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

// ============= Easing Functions =============
export const ease = {
  linear: (t: number) => t,
  quadIn: (t: number) => t * t,
  quadOut: (t: number) => t * (2 - t),
  quadInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  cubicIn: (t: number) => t * t * t,
  cubicOut: (t: number) => --t * t * t + 1,
  cubicInOut: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  quartIn: (t: number) => t * t * t * t,
  quartOut: (t: number) => 1 - --t * t * t * t,
  quartInOut: (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),
  quintIn: (t: number) => t * t * t * t * t,
  quintOut: (t: number) => 1 + --t * t * t * t * t,
  quintInOut: (t: number) => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t),
  sineIn: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  sineOut: (t: number) => Math.sin((t * Math.PI) / 2),
  sineInOut: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  expoIn: (t: number) => (t === 0 ? 0 : 2 ** (10 * (t - 1))),
  expoOut: (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  expoInOut: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (10 * t - 10)) / 2,
  circIn: (t: number) => 1 - Math.sqrt(1 - t * t),
  circOut: (t: number) => Math.sqrt(1 - --t * t),
  circInOut: (t: number) =>
    t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - 4 * (t - 1) * (t - 1)) + 1) / 2,
  elasticIn: (t: number) =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : -(2 ** (10 * t - 10)) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)),
  elasticOut: (t: number) =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  elasticInOut: (t: number) =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : t < 0.5
          ? -(2 ** (20 * t - 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2
          : (2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2 + 1,
  backIn: (t: number) => {
    const c1 = 1.70158,
      c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  backOut: (t: number) => {
    const c1 = 1.70158,
      c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  backInOut: (t: number) => {
    const c1 = 1.70158,
      c2 = c1 * 1.525;
    return t < 0.5
      ? ((2 * t) ** 2 * ((c2 + 1) * 2 * t - c2)) / 2
      : ((2 * t - 2) ** 2 * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  bounceIn: (t: number) => 1 - ease.bounceOut(1 - t),
  bounceOut: (t: number) => {
    const n1 = 7.5625,
      d1 = 2.75;
    return t < 1 / d1
      ? n1 * t * t
      : t < 2 / d1
        ? n1 * (t -= 1.5 / d1) * t + 0.75
        : t < 2.5 / d1
          ? n1 * (t -= 2.25 / d1) * t + 0.9375
          : n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  bounceInOut: (t: number) =>
    t < 0.5 ? (1 - ease.bounceOut(1 - 2 * t)) / 2 : (1 + ease.bounceOut(2 * t - 1)) / 2,
};
