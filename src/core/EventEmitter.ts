import { createLogger } from '../utils/logger';

const logger = createLogger('EventEmitter');

export interface Disposable {
    dispose(): void;
}

export class EventEmitter<T extends Record<string, unknown>> {
    private handlers = new Map<keyof T, Set<(event: any) => void>>();
    private batched = new Map<keyof T, any[]>();
    private batchId: number | ReturnType<typeof setTimeout> | null = null;

    on<K extends keyof T>(event: K, handler: (event: T[K]) => void): Disposable {
        const set = this.handlers.get(event) ?? new Set();
        if (!this.handlers.has(event)) this.handlers.set(event, set);
        set.add(handler);
        return { dispose: () => set.delete(handler) };
    }

    off<K extends keyof T>(event: K, handler?: (event: T[K]) => void): void {
        if (!handler) {
            this.handlers.delete(event);
            return;
        }
        this.handlers.get(event)?.delete(handler);
    }

    // Helper to safely invoke handlers
    private invokeHandlers(handlers: Set<(event: any) => void>, data: any): void {
        for (const h of handlers) {
            try { h(data); }
            catch (e) { logger.error('Event handler failed:', e); }
        }
    }

    emit<K extends keyof T>(event: K, data: T[K]): void {
        this.invokeHandlers(this.handlers.get(event) ?? [], data);
    }

    emitBatched<K extends keyof T>(event: K, data: T[K]): void {
        const arr = this.batched.get(event) ?? [];
        if (!this.batched.has(event)) this.batched.set(event, arr);
        arr.push(data);
        if (!this.batchId) {
            this.batchId =
                typeof window !== 'undefined' && 'requestAnimationFrame' in window
                    ? requestAnimationFrame(() => this.flushBatch())
                    : setTimeout(() => this.flushBatch(), 0);
        }
    }

    private flushBatch(): void {
        this.batchId = null;
        for (const [event, arr] of this.batched) {
            for (const data of arr) this.invokeHandlers(this.handlers.get(event) ?? [], data);
        }
        this.batched.clear();
    }

    emitWithTimestamp<K extends keyof T>(event: K, data: T[K] & { timestamp?: number }): void {
        this.invokeHandlers(this.handlers.get(event) ?? [], { ...data, timestamp: Date.now() });
    }

    removeAllListeners(): void {
        this.handlers.clear();
    }
    listenerCount<K extends keyof T>(event: K): number {
        return this.handlers.get(event)?.size ?? 0;
    }
    hasListeners<K extends keyof T>(event: K): boolean {
        return this.listenerCount(event) > 0;
    }
    eventNames(): IterableIterator<keyof T> {
        return this.handlers.keys();
    }

    clear(): void {
        if (this.batchId) {
            if (typeof this.batchId === 'number') cancelAnimationFrame(this.batchId);
            else clearTimeout(this.batchId);
            this.batchId = null;
        }
        this.batched.clear();
        this.handlers.clear();
    }
}
