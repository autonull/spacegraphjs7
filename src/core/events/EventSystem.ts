import mitt from 'mitt';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('EventSystem');

export interface SpaceGraphEvents {
    'node:added': { node: import('../../nodes/Node').Node; timestamp: number };
    'node:removed': { id: string; timestamp: number };
    'node:updated': {
        node: import('../../nodes/Node').Node;
        changes: Record<string, unknown>;
        timestamp: number;
    };
    'edge:added': { edge: import('../../edges/Edge').Edge; timestamp: number };
    'edge:removed': { id: string; timestamp: number };
    'edge:updated': {
        edge: import('../../edges/Edge').Edge;
        changes: Record<string, unknown>;
        timestamp: number;
    };
    'interaction:dragstart': { node: import('../../nodes/Node').Node; event: PointerEvent };
    'interaction:dragend': { node: import('../../nodes/Node').Node; event: PointerEvent };
    'interaction:drag': {
        node: import('../../nodes/Node').Node;
        position: [number, number, number];
    };
    'camera:move': { position: [number, number, number]; target: [number, number, number] };
    'selection:changed': { nodes: string[]; edges: string[]; timestamp: number };
    'node:click': { node: import('../../nodes/Node').Node; event: MouseEvent };
    'graph:click': { event: MouseEvent };
    'node:contextmenu': { node: import('../../nodes/Node').Node; event: MouseEvent };
    'graph:contextmenu': { event: MouseEvent };
    'vision:report': { report: import('../../vision/types').VisionReport; timestamp: number };
    'vision:overlap:detected': {
        overlaps: Array<{ nodeA: string; nodeB: string }>;
        timestamp: number;
    };
    'layout:applied': { layout: string; duration: number; timestamp: number };
    'plugin:ready': { pluginId: string; timestamp: number };
    'plugin:error': { pluginId: string; error: Error; timestamp: number };
    [key: string]: unknown;
    [key: symbol]: unknown;
}

export class EventSystem {
    private readonly emitter = mitt<SpaceGraphEvents>();
    private readonly batchedEvents = new Map<keyof SpaceGraphEvents, unknown[]>();
    private batchFrameId: number | ReturnType<typeof setTimeout> | null = null;

    on<K extends keyof SpaceGraphEvents>(
        type: K,
        handler: (event: SpaceGraphEvents[K]) => void,
    ): { dispose(): void } {
        this.emitter.on(type, handler);
        return { dispose: () => this.emitter.off(type, handler) };
    }

    off<K extends keyof SpaceGraphEvents>(
        type: K,
        handler?: (event: SpaceGraphEvents[K]) => void,
    ): void {
        this.emitter.off(type, handler);
    }

    emit<K extends keyof SpaceGraphEvents>(type: K, event: SpaceGraphEvents[K]): void {
        this.emitter.emit(type, event);
    }

    emitBatched<K extends keyof SpaceGraphEvents>(type: K, event: SpaceGraphEvents[K]): void {
        const events = this.batchedEvents.get(type) ?? [];
        if (!this.batchedEvents.has(type)) this.batchedEvents.set(type, events);
        events.push(event);
        if (this.batchFrameId === null) {
            this.batchFrameId =
                typeof window !== 'undefined' && 'requestAnimationFrame' in window
                    ? requestAnimationFrame(() => this.flushBatch())
                    : setTimeout(() => this.flushBatch(), 0);
        }
    }

    private flushBatch(): void {
        this.batchFrameId = null;
        for (const [type, events] of this.batchedEvents) {
            for (const event of events)
                this.emitter.emit(type, event as SpaceGraphEvents[typeof type]);
        }
        this.batchedEvents.clear();
    }

    clear(): void {
        if (this.batchFrameId !== null) {
            if (typeof this.batchFrameId === 'number') {
                cancelAnimationFrame(this.batchFrameId);
            } else {
                clearTimeout(this.batchFrameId);
            }
            this.batchFrameId = null;
        }
        this.batchedEvents.clear();
        this.emitter.all.clear();
    }

    listenerCount<K extends keyof SpaceGraphEvents>(type: K): number {
        const handlers = this.emitter.all.get(type);
        return Array.isArray(handlers) ? handlers.length : 0;
    }
}
