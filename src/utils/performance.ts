// Performance optimization utilities
import { throttle, debounce } from './math';

/**
 * Performance monitor for tracking FPS and memory
 */
export class PerformanceMonitor {
  private frames = 0;
  private lastTime = 0;
  private fps = 0;
  private history: number[] = [];
  private historySize: number;

  constructor(historySize: number = 60) {
    this.historySize = historySize;
  }

  update(): number {
    this.frames++;
    const now = performance.now();
    
    if (now - this.lastTime >= 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.lastTime = now;
      this.history.push(this.fps);
      
      if (this.history.length > this.historySize) {
        this.history.shift();
      }
    }
    
    return this.fps;
  }

  getFPS(): number {
    return this.fps;
  }

  getAverageFPS(): number {
    return this.history.length === 0 ? 0 : this.history.reduce((a, b) => a + b, 0) / this.history.length;
  }

  getMinFPS(): number {
    return this.history.length === 0 ? 0 : Math.min(...this.history);
  }

  reset(): void {
    this.frames = 0;
    this.lastTime = performance.now();
    this.history = [];
  }
}

// memoize exported from math.ts to avoid duplication

/**
 * Object pool for reducing allocations
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, maxSize: number = 100, resetFn?: (obj: T) => void) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      this.resetFn?.(obj);
      return obj;
    }
    return this.createFn();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  clear(): void {
    this.pool = [];
  }

  size(): number {
    return this.pool.length;
  }
}

// memoize exported from math.ts (see utils/index.ts)

/**
 * Batch operations for better performance
 */
export function batch<T>(items: T[], batchSize: number, fn: (batch: T[]) => void): void {
  for (let i = 0; i < items.length; i += batchSize) {
    fn(items.slice(i, i + batchSize));
  }
}

/**
 * Async batch processor
 */
export async function batchAsync<T>(
  items: T[],
  batchSize: number,
  fn: (batch: T[]) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    await fn(items.slice(i, i + batchSize));
  }
}

/**
 * Request idle callback wrapper
 */
export function requestIdleCallbackPolyfill(callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void, timeout?: number): number {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, { timeout });
  }
  
  // Fallback for environments without requestIdleCallback
  const start = Date.now();
  return window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    });
  }, 1) as unknown as number;
}

/**
 * Cancel idle callback wrapper
 */
export function cancelIdleCallbackPolyfill(handle: number): void {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(handle);
  } else {
    window.clearTimeout(handle);
  }
}

export const throttleByTime = throttle;
export const debounceByTime = debounce;

/**
 * Track memory usage (if available)
 */
export function getMemoryUsage(): { used: number; total: number } | null {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const mem = (performance as any).memory;
    return {
      used: mem.usedJSHeapSize,
      total: mem.totalJSHeapSize,
    };
  }
  return null;
}

/**
 * Measure execution time
 */
export function measure<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * Async measure execution time
 */
export async function measureAsync<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}
