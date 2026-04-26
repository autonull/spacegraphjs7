import { createLogger } from '../utils/logger';

const logger = createLogger('EventEmitter');

export interface Disposable { dispose(): void; }

export class EventEmitter<T extends Record<string, unknown>> {
    private eventHandlers = new Map<keyof T, Set<(event: T[keyof T]) => void>>();
    private batchedEvents = new Map<keyof T, unknown[]>();
    private batchFrameId: number | ReturnType<typeof setTimeout> | null = null;

    on<K extends keyof T>(event: K, handler: (event: T[K]) => void): Disposable {
        const handlers = this.eventHandlers.get(event) ?? new Set();
        if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, handlers);
        handlers.add(handler as (event: T[keyof T]) => void);
        return { dispose: () => { handlers.delete(handler as (event: T[keyof T]) => void); } };
    }

    off<K extends keyof T>(event: K, handler?: (event: T[K]) => void): void {
        if (handler === undefined) { this.eventHandlers.delete(event); return; }
        this.eventHandlers.get(event)?.delete(handler as (event: T[keyof T]) => void);
    }

    protected emit<K extends keyof T>(event: K, data: T[K]): void {
        for (const handler of this.eventHandlers.get(event) ?? []) {
            try { handler(data); } catch (err) { logger.error(`Event handler for %s failed:`, event, err); }
        }
    }

    emitBatched<K extends keyof T>(event: K, data: T[K]): void {
        const events = this.batchedEvents.get(event) ?? [];
        if (!this.batchedEvents.has(event)) this.batchedEvents.set(event, events);
        events.push(data);
        if (this.batchFrameId === null) {
            this.batchFrameId = typeof window !== 'undefined' && 'requestAnimationFrame' in window
                ? requestAnimationFrame(() => this.flushBatch())
                : setTimeout(() => this.flushBatch(), 0);
        }
    }

    private flushBatch(): void {
        this.batchFrameId = null;
        for (const [event, events] of this.batchedEvents) {
            for (const data of events) this.emit(event, data as T[typeof event]);
        }
        this.batchedEvents.clear();
    }

    protected emitWithTimestamp<K extends keyof T>(event: K, data: Omit<T[K] & { timestamp: number }, 'timestamp'>): void {
        const eventData = { ...data, timestamp: Date.now() } as T[K];
        for (const handler of this.eventHandlers.get(event) ?? []) {
            try { handler(eventData); } catch (err) { logger.error(`Event handler for %s failed:`, event, err); }
        }
    }

    removeAllListeners(): void { this.eventHandlers.clear(); }
    listenerCount<K extends keyof T>(event: K): number { return this.eventHandlers.get(event)?.size ?? 0; }
    hasListeners<K extends keyof T>(event: K): boolean { return this.listenerCount(event) > 0; }
    eventNames(): IterableIterator<keyof T> { return this.eventHandlers.keys(); }

    clear(): void {
        if (this.batchFrameId !== null) {
            if (typeof this.batchFrameId === 'number') cancelAnimationFrame(this.batchFrameId);
            else clearTimeout(this.batchFrameId);
            this.batchFrameId = null;
        }
        this.batchedEvents.clear();
        this.eventHandlers.clear();
    }
}
