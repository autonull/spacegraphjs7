// Core utility functions - inline definitions for common operations

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Map a value from one range to another
 */
export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Smoothstep interpolation
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Generate random number in range
 */
export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Generate random integer in range
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string | number): { r: number; g: number; b: number } {
  const num = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Deep merge objects
 */
export function mergeDeep<T>(target: T, source: Partial<T>): T {
  const output = { ...target };
  
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      output[key] = mergeDeep(target[key] as any, source[key] as any);
    } else {
      output[key] = source[key] as any;
    }
  }
  
  return output;
}

/**
 * Deep clone with JSON (handles circular refs poorly)
 */
export function safeClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

/**
 * Convert to hex color string
 */
export function toHexColor(color: string | number): string {
  if (typeof color === 'number') {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
  return color.startsWith('#') ? color : `#${color}`;
}

/**
 * Constants to radians
 */
export const DEG2RAD = Math.PI / 180;

/**
 * Radians to degrees
 */
export const RAD2DEG = 180 / Math.PI;

/**
 * Error wrapper with context
 */
export function wrapError(error: unknown, context: { namespace: string; operation: string; reason: string }, logger?: any): Error {
  const message = `[${context.namespace}] ${context.operation}: ${context.reason} - ${error instanceof Error ? error.message : String(error)}`;
  const wrapped = new Error(message);
  wrapped.stack = error instanceof Error ? error.stack : undefined;
  logger?.error?.(message);
  return wrapped;
}

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {},
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime: number | null = null;
  
  return function(...args: Parameters<T>) {
    const now = Date.now();
    const callNow = options.leading && !lastCallTime;
    
    if (lastCallTime && now - lastCallTime >= (options.maxWait ?? wait)) {
      if (timeout) clearTimeout(timeout);
      timeout = null;
      func(...args);
      lastCallTime = now;
      return;
    }
    
    if (timeout) clearTimeout(timeout);
    
    if (callNow) {
      func(...args);
      lastCallTime = now;
    } else if (options.trailing ?? true) {
      timeout = setTimeout(() => {
        func(...args);
        lastCallTime = Date.now();
      }, wait);
    }
  };
}

/**
 * Create a throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastFunc: ReturnType<typeof setTimeout> | null = null;
  let lastCall: Parameters<T> | null = null;
  
  return function(...args: Parameters<T>) {
    if (inThrottle) {
      lastCall = args;
      if (lastFunc) clearTimeout(lastFunc);
      if (options.trailing ?? false) {
        lastFunc = setTimeout(() => {
          inThrottle = false;
          lastFunc = null;
          if (lastCall) {
            func(...lastCall);
            lastCall = null;
          }
        }, limit);
      }
      return;
    }
    
    if (options.leading ?? true) {
      func(...args);
    }
    
    inThrottle = true;
    setTimeout(() => {
      inThrottle = false;
    }, limit);
  };
}

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is a promise
 */
export function isPromise<T>(value: any): value is Promise<T> {
  return value instanceof Promise;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
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

/**
 * Group array by key
 */
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

/**
 * Unique items in array
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * Flatten array
 */
export function flatten<T>(array: T[][]): T[] {
  return array.flat();
}

/**
 * Chunk array into pieces
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}
