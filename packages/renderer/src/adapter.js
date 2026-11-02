// The scaffolding every renderer adapter shares. The contract package is the dependency-free home
// for it: the adapters depend on the contract, and the contract depends on nothing.
import { RendererEventBus } from './events';
/**
 * The base every interactive renderer adapter builds on: the event bus, the `on`/`emit` pair, and
 * the guard that keeps a selection the host asked for from echoing back as a user selection.
 *
 * The adapters keep their own `setSelection` — the core clears and selects, Cytoscape unselects
 * and selects by id — so only the guard is shared.
 */
export class BaseGraphRenderer {
    events = new RendererEventBus();
    /** True while the renderer applies a selection the host asked for; the echo is ignored. */
    applyingSelection = false;
    on(event, handler) {
        return this.events.on(event, handler);
    }
    emit(event, payload) {
        this.events.emit(event, payload);
    }
    /**
     * Apply a selection the host asked for. The renderer echoes selection changes back to the host;
     * this guard keeps that echo from bouncing.
     */
    applySelection(ids, apply) {
        this.applyingSelection = true;
        try {
            apply(ids);
        } finally {
            this.applyingSelection = false;
        }
    }
}
