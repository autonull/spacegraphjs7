// Performance optimization utilities

/** Splits items into fixed-size batches and passes each to `fn`. */
export function batch<T>(items: T[], batchSize: number, fn: (batch: T[]) => void): void {
    for (let i = 0; i < items.length; i += batchSize) {
        fn(items.slice(i, i + batchSize));
    }
}

/** Runs `fn` and reports its result alongside the elapsed milliseconds. */
export function measure<T>(fn: () => T): { result: T; duration: number } {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    return { result, duration };
}
