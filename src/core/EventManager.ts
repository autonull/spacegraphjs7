import mitt, { Emitter } from 'mitt';
import type { SpaceGraph } from '../SpaceGraph';

export type SpaceGraphEvents = {
    'node:added': { node: any };
    'node:removed': { id: string };
    'edge:added': { edge: any };
    'edge:removed': { id: string };
    'interaction:dragstart': { node: any };
    'interaction:dragend': { node: any };
    'interaction:drag': { node: any };
    'camera:move': { position: any; target: any };
    'node:click': { node: any; event: any };
    'graph:click': { event: any };
    'node:contextmenu': { node: any; event: MouseEvent };
    'graph:contextmenu': { event: MouseEvent };
    'node:loaded': { id: string };
    'ergonomics:calibrated': { winner: any; scores: any };
};

export class EventManager {
    private sg: SpaceGraph;
    private emitter: Emitter<SpaceGraphEvents>;

    // Event batching state: mapping event types to an array of event payloads
    // Throttles high-frequency events to emit all batched states per frame
    private batchedEvents: Map<string | symbol, any[]> = new Map();
    private batchFrameId: number | null = null;

    constructor(sg: SpaceGraph) {
        this.sg = sg;
        this.emitter = mitt<SpaceGraphEvents>();
    }

    on<Key extends keyof SpaceGraphEvents>(
        type: Key,
        handler: (event: SpaceGraphEvents[Key]) => void,
    ): void {
        this.emitter.on(type, handler);
    }

    off<Key extends keyof SpaceGraphEvents>(
        type: Key,
        handler?: (event: SpaceGraphEvents[Key]) => void,
    ): void {
        this.emitter.off(type, handler);
    }

    /**
     * Emit an event immediately.
     */
    emit<Key extends keyof SpaceGraphEvents>(type: Key, event: SpaceGraphEvents[Key]): void {
        this.emitter.emit(type, event);
    }

    /**
     * Emit an event but throttle it to the next requestAnimationFrame.
     * Useful for high-frequency events (like camera move or node drag) to
     * prevent React/SolidJS state thrashing. Keeps only the latest payload.
     */
    emitBatched<Key extends keyof SpaceGraphEvents>(type: Key, event: SpaceGraphEvents[Key]): void {
        const typeKey = type as string | symbol;
        if (!this.batchedEvents.has(typeKey)) {
            this.batchedEvents.set(typeKey, []);
        }
        this.batchedEvents.get(typeKey)!.push(event);

        if (this.batchFrameId === null) {
            if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
                this.batchFrameId = requestAnimationFrame(() => {
                    this.flushBatchedEvents();
                });
            } else {
                // Fallback for SSR / Node environments
                this.flushBatchedEvents();
            }
        }
    }

    private flushBatchedEvents(): void {
        this.batchFrameId = null;
        for (const [type, events] of this.batchedEvents.entries()) {
            for (const event of events) {
                this.emitter.emit(type as keyof SpaceGraphEvents, event);
            }
        }
        this.batchedEvents.clear();
    }

    clear(): void {
        if (this.batchFrameId !== null) {
            cancelAnimationFrame(this.batchFrameId);
            this.batchFrameId = null;
        }
        this.batchedEvents.clear();
        this.emitter.all.clear();
    }
}
