import { createLogger } from '../utils/logger';

const logger = createLogger('EventEmitter');
const NO_HANDLERS: ReadonlySet<(event: any) => void> = new Set();

export interface Disposable {
    dispose(): void;
}

export class EventEmitter<T extends Record<string, any> = any> {
    private handlers = new Map<keyof T, Set<(event: any) => void>>();
    private batched = new Map<keyof T, any[]>();
    private cancelBatch: (() => void) | null = null;

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

    emit<K extends keyof T>(event: K, data: T[K], options?: { batch?: boolean }): void {
        if (options?.batch) {
            this.emitBatched(event, data);
        } else {
            this.invokeHandlers(this.handlers.get(event) ?? NO_HANDLERS, data);
        }
    }

    emitBatched<K extends keyof T>(event: K, data: T[K]): void {
        const arr = this.batched.get(event) ?? [];
        if (!this.batched.has(event)) this.batched.set(event, arr);
        arr.push(data);
        if (!this.cancelBatch) {
            const flush = () => this.flushBatch();
            if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
                const id = requestAnimationFrame(flush);
                this.cancelBatch = () => cancelAnimationFrame(id);
            } else {
                const id = setTimeout(flush, 0);
                this.cancelBatch = () => clearTimeout(id);
            }
        }
    }

    emitWithTimestamp<K extends keyof T>(
        event: K,
        data: Omit<T[K], 'timestamp'> & { timestamp?: number },
    ): void {
        this.invokeHandlers(this.handlers.get(event) ?? NO_HANDLERS, {
            ...data,
            timestamp: Date.now(),
        });
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
        if (this.cancelBatch) {
            this.cancelBatch();
            this.cancelBatch = null;
        }
        this.batched.clear();
        this.handlers.clear();
    }

    // Helper to safely invoke handlers
    private invokeHandlers(handlers: ReadonlySet<(event: any) => void>, data: any): void {
        for (const h of handlers) {
            try {
                h(data);
            } catch (e) {
                logger.error('Event handler failed:', e);
            }
        }
    }

    private flushBatch(): void {
        this.cancelBatch = null;
        for (const [event, arr] of this.batched) {
            const handlers = this.handlers.get(event);
            if (handlers) {
                for (const data of arr) this.invokeHandlers(handlers, data);
            }
        }
        this.batched.clear();
    }
}
