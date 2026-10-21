// The scaffolding every renderer adapter shares. The contract package is the dependency-free home
// for it: the adapters depend on the contract, and the contract depends on nothing.

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
export abstract class BaseGraphRenderer {
  protected readonly events = new RendererEventBus();
  /** True while the renderer applies a selection the host asked for; the echo is ignored. */
  protected applyingSelection = false;

  on<K extends keyof RendererEventMap>(event: K, handler: Handler<K>): Unsubscribe {
    return this.events.on(event, handler);
  }

  protected emit<K extends keyof RendererEventMap>(event: K, payload: RendererEventMap[K]): void {
    this.events.emit(event, payload);
  }

  /**
   * Apply a selection the host asked for. The renderer echoes selection changes back to the host;
   * this guard keeps that echo from bouncing.
   */
  protected applySelection(ids: readonly string[], apply: (ids: readonly string[]) => void): void {
    this.applyingSelection = true;
    try {
      apply(ids);
    } finally {
      this.applyingSelection = false;
    }
  }
}
