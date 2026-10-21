// Generic accessibility mirror for graph canvases. Renders a visually hidden, ordered node/edge list
// with roving tabindex, keyboard selection, and an aria-live selection announcement. It accepts a
// minimal structural item so the core never imports the renderer contract; a host passes
// `RenderModel.nodes` mapped to `{ id, label, kind, status, interactive }`.

import { clamp } from '../utils/math';

export interface AccessibleItem {
  id: string;
  label: string;
  kind?: string;
  status?: string;
  /** Non-interactive items are listed but skipped by keyboard traversal. Defaults to true. */
  interactive?: boolean;
}

export interface AccessibleEdge {
  id: string;
  source: string;
  target: string;
  kind?: string;
  /** The text a screen reader reads for the connection; the host composes it. */
  label?: string;
}

export interface AccessibilityLayerOptions {
  label?: string;
  /** Called with the id when the user activates an item (Enter/Space). */
  onSelect?: (id: string) => void;
  /** Called when Escape is pressed on the list (e.g. go back or clear focus). */
  onEscape?: () => void;
  /** Localized announcement for a selection change; defaults to English. */
  formatSelection?: (labels: readonly string[]) => string;
  /** The label of the connection list; defaults to English. */
  edgeLabel?: string;
  /** Localized announcement for the connections of the selected nodes; defaults to none. */
  edgeAnnouncer?: (edges: readonly AccessibleEdge[]) => string;
}

const HIDDEN_STYLE =
  'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;' +
  'clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;';

export class AccessibilityLayer {
  readonly #container: HTMLElement;
  readonly #options: AccessibilityLayerOptions;
  readonly #list: HTMLUListElement;
  readonly #live: HTMLDivElement;
  #edgeList: HTMLUListElement | undefined;
  #items: AccessibleItem[] = [];
  #edges: AccessibleEdge[] = [];
  #focusIndex = 0;
  readonly #selected = new Set<string>();
  readonly #onKeyDown = (event: KeyboardEvent) => this.#handleKeyDown(event);
  #disposed = false;

  constructor(container: HTMLElement, options: AccessibilityLayerOptions = {}) {
    this.#container = container;
    this.#options = options;
    container.setAttribute('style', `${container.getAttribute('style') ?? ''};${HIDDEN_STYLE}`);
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', options.label ?? 'Graph contents');
    this.#list = document.createElement('ul');
    this.#list.style.listStyle = 'none';
    this.#list.style.margin = '0';
    this.#live = document.createElement('div');
    this.#live.setAttribute('aria-live', 'polite');
    this.#live.setAttribute('aria-atomic', 'true');
    container.append(this.#list, this.#live);
    this.#list.addEventListener('keydown', this.#onKeyDown);
  }

  get items(): readonly AccessibleItem[] {
    return this.#items;
  }

  get selected(): readonly string[] {
    return [...this.#selected];
  }

  get currentId(): string | undefined {
    return this.#items[this.#focusIndex]?.id;
  }

  get edges(): readonly AccessibleEdge[] {
    return this.#edges;
  }

  /** Lists the connections of the graph next to the nodes, so the structure is reachable. */
  setEdges(edges: readonly AccessibleEdge[]): void {
    this.#edges = [...edges];
    if (this.#edges.length === 0) {
      this.#edgeList?.remove();
      this.#edgeList = undefined;
      return;
    }
    if (!this.#edgeList) {
      this.#edgeList = document.createElement('ul');
      this.#edgeList.style.listStyle = 'none';
      this.#edgeList.style.margin = '0';
      this.#edgeList.setAttribute('aria-label', this.#options.edgeLabel ?? 'Connections');
      this.#container.insertBefore(this.#edgeList, this.#live);
    }
    this.#edgeList.replaceChildren(
      ...this.#edges.map((edge) => {
        const li = document.createElement('li');
        li.dataset.edge = edge.id;
        li.textContent = [edge.label ?? `${edge.source} to ${edge.target}`, edge.kind]
          .filter(Boolean)
          .join(' — ');
        return li;
      })
    );
  }

  setItems(items: readonly AccessibleItem[]): void {
    const currentId = this.currentId;
    const focusIndex = currentId ? items.findIndex((item) => item.id === currentId) : -1;
    this.#items = [...items];
    this.#focusIndex =
      focusIndex >= 0 && items[focusIndex].interactive !== false
        ? focusIndex
        : this.#firstInteractive(0, 1);
    this.#render();
  }

  setSelected(ids: string | readonly string[] | null): void {
    this.#selected.clear();
    for (const id of ids == null ? [] : typeof ids === 'string' ? [ids] : ids) this.#selected.add(id);
    this.#render();
    const labels = this.#items
      .filter((item) => this.#selected.has(item.id))
      .map((item) => item.label);
    const selection =
      this.#options.formatSelection?.(labels) ??
      (labels.length ? `Selected ${labels.join(', ')}` : 'Selection cleared');
    const connections = this.#options.edgeAnnouncer?.(this.#edgesForSelection());
    this.announce(connections ? `${selection} ${connections}` : selection);
  }

  focus(id?: string): void {
    const index = id ? this.#items.findIndex((item) => item.id === id) : this.#focusIndex;
    if (index >= 0) this.#focusIndex = index;
    this.#render();
    (this.#list.children[this.#focusIndex] as HTMLElement | undefined)?.focus();
  }

  announce(message: string): void {
    this.#live.textContent = message;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#list.removeEventListener('keydown', this.#onKeyDown);
    this.#list.replaceChildren();
    this.#edgeList?.remove();
    this.#edgeList = undefined;
    this.#live.textContent = '';
    this.#container.removeAttribute('role');
    this.#container.removeAttribute('aria-label');
  }

  #handleKeyDown(event: KeyboardEvent): void {
    const moves: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, Home: -2, End: 2 };
    if (event.key in moves) {
      event.preventDefault();
      const step = moves[event.key];
      if (step === -2) this.#focusIndex = this.#firstInteractive(0, 1);
      else if (step === 2) this.#focusIndex = this.#firstInteractive(this.#items.length - 1, -1);
      else this.#focusIndex = this.#firstInteractive(this.#focusIndex, step, true);
      this.#render();
      (this.#list.children[this.#focusIndex] as HTMLElement | undefined)?.focus();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      const id = this.currentId;
      if (id) this.#options.onSelect?.(id);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.#options.onEscape?.();
    }
  }

  #edgesForSelection(): AccessibleEdge[] {
    if (this.#selected.size === 0) return [];
    return this.#edges.filter(
      (edge) => this.#selected.has(edge.source) || this.#selected.has(edge.target)
    );
  }

  #firstInteractive(from: number, step: number, exclusive = false): number {
    const length = this.#items.length;
    if (!length) return 0;
    const start = clamp(exclusive ? from + step : from, 0, length - 1);
    for (let index = start; index >= 0 && index < length; index += step) {
      if (this.#items[index].interactive !== false) return index;
    }
    for (let index = start; index >= 0 && index < length; index -= step) {
      if (this.#items[index].interactive !== false) return index;
    }
    return start;
  }

  #render(): void {
    const focusedInteractive = this.#items[this.#focusIndex]?.interactive !== false;
    this.#list.replaceChildren(
      ...this.#items.map((item, index) => {
        const interactive = item.interactive !== false;
        const focused = interactive && index === this.#focusIndex && focusedInteractive;
        const li = document.createElement('li');
        li.dataset.id = item.id;
        li.textContent = [item.label, item.kind, item.status].filter(Boolean).join(' — ');
        li.setAttribute('aria-selected', String(this.#selected.has(item.id)));
        if (!interactive) li.setAttribute('aria-disabled', 'true');
        li.tabIndex = focused ? 0 : -1;
        li.addEventListener('click', () => this.#options.onSelect?.(item.id));
        return li;
      })
    );
  }
}
