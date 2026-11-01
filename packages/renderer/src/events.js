/**
 * The event bus every renderer adapter shares: a set of handlers per event, and the unsubscribe a
 * host gets back. One implementation, so the adapters agree on what an event does.
 */
export class RendererEventBus {
    #handlers = new Map();
    on(event, handler) {
        const set = this.#handlers.get(event) ?? new Set();
        set.add(handler);
        this.#handlers.set(event, set);
        return () => set.delete(handler);
    }
    emit(event, payload) {
        for (const handler of this.#handlers.get(event) ?? new Set()) {
            handler(payload);
        }
    }
    clear() {
        this.#handlers.clear();
    }
}
