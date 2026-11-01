import type { RendererEventMap, Unsubscribe } from './index';
export type Handler<K extends keyof RendererEventMap> = (payload: RendererEventMap[K]) => void;
/**
 * The event bus every renderer adapter shares: a set of handlers per event, and the unsubscribe a
 * host gets back. One implementation, so the adapters agree on what an event does.
 */
export declare class RendererEventBus {
    #private;
    on<K extends keyof RendererEventMap>(event: K, handler: Handler<K>): Unsubscribe;
    emit<K extends keyof RendererEventMap>(event: K, payload: RendererEventMap[K]): void;
    clear(): void;
}
//# sourceMappingURL=events.d.ts.map