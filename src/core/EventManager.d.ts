import type { SpaceGraph } from '../SpaceGraph';
export type SpaceGraphEvents = {
    'node:added': {
        node: any;
    };
    'node:removed': {
        id: string;
    };
    'edge:added': {
        edge: any;
    };
    'edge:removed': {
        id: string;
    };
    'interaction:dragstart': {
        node: any;
    };
    'interaction:dragend': {
        node: any;
    };
    'interaction:drag': {
        node: any;
    };
    'camera:move': {
        position: any;
        target: any;
    };
    'node:click': {
        node: any;
        event: any;
    };
    'graph:click': {
        event: any;
    };
    'node:loaded': {
        id: string;
    };
    'ergonomics:calibrated': {
        winner: any;
        scores: any;
    };
};
export declare class EventManager {
    private sg;
    private emitter;
    private batchedEvents;
    private batchFrameId;
    constructor(sg: SpaceGraph);
    on<Key extends keyof SpaceGraphEvents>(
        type: Key,
        handler: (event: SpaceGraphEvents[Key]) => void,
    ): void;
    off<Key extends keyof SpaceGraphEvents>(
        type: Key,
        handler?: (event: SpaceGraphEvents[Key]) => void,
    ): void;
    /**
     * Emit an event immediately.
     */
    emit<Key extends keyof SpaceGraphEvents>(type: Key, event: SpaceGraphEvents[Key]): void;
    /**
     * Emit an event but throttle it to the next requestAnimationFrame.
     * Useful for high-frequency events (like camera move or node drag) to
     * prevent React/SolidJS state thrashing.
     */
    emitBatched<Key extends keyof SpaceGraphEvents>(type: Key, event: SpaceGraphEvents[Key]): void;
    private flushBatchedEvents;
    clear(): void;
}
