// SpaceGraphJS - Event Emitter Base Class
// Shared event system for Node, Edge, Graph, and other components

import { createLogger } from '../utils/logger';

const logger = createLogger('EventEmitter');

export interface Disposable {
    dispose(): void;
}

export class EventEmitter<T extends Record<string, unknown>> {
    private readonly eventHandlers = new Map<keyof T, Set<(event: T[keyof T]) => void>>();

    on<K extends keyof T>(event: K, handler: (event: T[K]) => void): Disposable {
        const handlers = this.eventHandlers.get(event) ?? new Set();
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, handlers);
        }
        handlers.add(handler as (event: T[keyof T]) => void);
        return {
            dispose: () => handlers.delete(handler as (event: T[keyof T]) => void),
        };
    }

    off<K extends keyof T>(event: K, handler?: (event: T[K]) => void): void {
        if (handler === undefined) {
            this.eventHandlers.delete(event);
            return;
        }
        this.eventHandlers.get(event)?.delete(handler as (event: T[keyof T]) => void);
    }

    protected emit<K extends keyof T>(event: K, data: T[K]): void {
        this.eventHandlers.get(event)?.forEach((handler) => {
            try {
                handler(data);
            } catch (err) {
                logger.error(`Event handler for %s failed:`, event, err);
            }
        });
    }

    protected emitWithTimestamp<K extends keyof T>(
        event: K,
        data: Omit<T[K] & { timestamp: number }, 'timestamp'>,
    ): void {
        const eventData = { ...data, timestamp: Date.now() } as T[K];
        this.eventHandlers.get(event)?.forEach((handler) => {
            try {
                handler(eventData);
            } catch (err) {
                logger.error(`Event handler for %s failed:`, event, err);
            }
        });
    }

    removeAllListeners(): void {
        this.eventHandlers.clear();
    }

    listenerCount<K extends keyof T>(event: K): number {
        return this.eventHandlers.get(event)?.size ?? 0;
    }
}
