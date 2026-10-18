// Generic navigation trail: a back/forward history of graph locations. Framework- and
// renderer-agnostic; it accepts the minimal structural shape a host has (id, label, kind) so the
// core never imports the renderer contract.

export interface TrailNode {
  id: string;
  label?: string;
  kind?: string;
}

export interface TrailOptions {
  /** Maximum number of entries retained; the oldest are dropped first. */
  maxDepth?: number;
}

export type TrailListener = (entries: readonly TrailNode[]) => void;

export class Trail {
  readonly #maxDepth: number;
  readonly #listeners = new Set<TrailListener>();
  #entries: TrailNode[] = [];
  #index = -1;

  constructor(options: TrailOptions = {}) {
    this.#maxDepth = options.maxDepth && options.maxDepth > 0 ? Math.floor(options.maxDepth) : Infinity;
  }

  get entries(): readonly TrailNode[] {
    return this.#entries;
  }

  get current(): TrailNode | undefined {
    return this.#entries[this.#index];
  }

  get depth(): number {
    return this.#index + 1;
  }

  get canGoBack(): boolean {
    return this.#index > 0;
  }

  get canGoForward(): boolean {
    return this.#index >= 0 && this.#index < this.#entries.length - 1;
  }

  // Navigate to a node. Anything ahead of the cursor is discarded; history is trimmed to maxDepth.
  // Re-pushing the current node refreshes it in place instead of adding a duplicate.
  push(node: TrailNode): void {
    if (this.current?.id === node.id) {
      this.#entries[this.#index] = node;
    } else {
      this.#entries = [...this.#entries.slice(0, this.#index + 1), node];
      if (this.#entries.length > this.#maxDepth) {
        this.#entries = this.#entries.slice(this.#entries.length - this.#maxDepth);
      }
      this.#index = this.#entries.length - 1;
    }
    this.#emit();
  }

  // Replace the current node without adding history (e.g. a label refresh).
  replace(node: TrailNode): void {
    if (this.#index < 0) return this.push(node);
    this.#entries[this.#index] = node;
    this.#emit();
  }

  back(): TrailNode | undefined {
    if (this.canGoBack) this.#index -= 1;
    this.#emit();
    return this.current;
  }

  forward(): TrailNode | undefined {
    if (this.canGoForward) this.#index += 1;
    this.#emit();
    return this.current;
  }

  reset(node?: TrailNode): void {
    this.#entries = node ? [node] : [];
    this.#index = node ? 0 : -1;
    this.#emit();
  }

  // Refresh entries from a by-id lookup after a render-model update: entries whose id still exists
  // are updated in place, dropped ids are removed, and the cursor is clamped. Resets when nothing
  // survives, so trail state survives model updates by ID.
  reconcile(byId: ReadonlyMap<string, TrailNode>): void {
    const kept = this.#entries.flatMap((entry) => {
      const next = byId.get(entry.id);
      return next ? [next] : [];
    });
    if (!kept.length) return this.reset();
    const currentId = this.current?.id;
    this.#entries = kept;
    const index = currentId ? kept.findIndex((entry) => entry.id === currentId) : -1;
    this.#index = index >= 0 ? index : kept.length - 1;
    this.#emit();
  }

  toLabels(): string[] {
    return this.#entries.map((entry) => entry.label ?? entry.id);
  }

  onChange(listener: TrailListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit(): void {
    for (const listener of this.#listeners) listener(this.#entries);
  }
}
