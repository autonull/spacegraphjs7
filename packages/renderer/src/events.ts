import type { RendererEventMap, Unsubscribe } from './index';

export type Handler<K extends keyof RendererEventMap> = (payload: RendererEventMap[K]) => void;

/**
 * The event bus every renderer adapter shares: a set of handlers per event, and the unsubscribe a
 * host gets back. One implementation, so the adapters agree on what an event does.
 */
export class RendererEventBus {
  readonly #handlers = new Map<keyof RendererEventMap, Set<Handler<never>>>();

  on<K extends keyof RendererEventMap>(event: K, handler: Handler<K>): Unsubscribe {
    const set = this.#handlers.get(event) ?? new Set<Handler<never>>();
    set.add(handler as Handler<never>);
    this.#handlers.set(event, set);
    return () => set.delete(handler as Handler<never>);
  }

  emit<K extends keyof RendererEventMap>(event: K, payload: RendererEventMap[K]): void {
    for (const handler of this.#handlers.get(event) ?? new Set<Handler<never>>()) {
      (handler as Handler<K>)(payload);
    }
  }

  clear(): void {
    this.#handlers.clear();
  }
}
