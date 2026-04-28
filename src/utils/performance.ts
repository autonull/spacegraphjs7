// Performance optimization utilities

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

/**
 * Memoization decorator factory
 */
export function memoize<T extends (...args: any[]) => any>(fn: T, cacheSize: number = 100): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return function(...args: any[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    
    if (cache.size >= cacheSize) {
      cache.delete(cache.keys().next().value);
    }
    
    cache.set(key, result);
    return result;
  } as T;
}

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

/**
 * Throttle function by time
 */
export function throttleByTime<T extends (...args: any[]) => any>(fn: T, limit: number): T {
  let lastCall = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: any[]) {
    const now = Date.now();
    
    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        timeout = null;
        fn(...args);
      }, limit - (now - lastCall));
    }
  } as T;
}

/**
 * Debounce function by time
 */
export function debounceByTime<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: any[]) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  } as T;
}

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
