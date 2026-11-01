import { RendererEventBus } from './events';
import type { Handler } from './events';
import type { RendererEventMap, Unsubscribe } from './index';
export type { Handler };
/**
 * The base every interactive renderer adapter builds on: the event bus, the `on`/`emit` pair, and
 * the guard that keeps a selection the host asked for from echoing back as a user selection.
 *
 * The adapters keep their own `setSelection` — the core clears and selects, Cytoscape unselects
 * and selects by id — so only the guard is shared.
 */
export declare abstract class BaseGraphRenderer {
    protected readonly events: RendererEventBus;
    /** True while the renderer applies a selection the host asked for; the echo is ignored. */
    protected applyingSelection: boolean;
    on<K extends keyof RendererEventMap>(event: K, handler: Handler<K>): Unsubscribe;
    protected emit<K extends keyof RendererEventMap>(event: K, payload: RendererEventMap[K]): void;
    /**
     * Apply a selection the host asked for. The renderer echoes selection changes back to the host;
     * this guard keeps that echo from bouncing.
     */
    protected applySelection(ids: readonly string[], apply: (ids: readonly string[]) => void): void;
}
//# sourceMappingURL=adapter.d.ts.map