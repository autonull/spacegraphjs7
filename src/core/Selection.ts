import type { SpaceGraph } from '../SpaceGraph';

// One selection source of truth for click, box-select, keyboard, and programmatic paths.
// Focus and camera movement stay separate (see FocusManager and focusNode).
export class Selection {
  private readonly ids = new Set<string>();

  constructor(readonly sg: SpaceGraph) {}

  get list(): string[] {
    return [...this.ids];
  }

  get size(): number {
    return this.ids.size;
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  select(target: string | readonly string[] | null): void {
    this.apply(target == null ? [] : typeof target === 'string' ? [target] : target);
  }

  clear(): void {
    this.apply([]);
  }

  deselect(id: string): void {
    if (!this.ids.has(id)) return;
    this.apply(this.list.filter((current) => current !== id));
  }

  toggle(id: string): void {
    this.apply(this.ids.has(id) ? this.list.filter((current) => current !== id) : [...this.list, id]);
  }

  private apply(next: readonly string[]): void {
    const nextSet = new Set(
      next.filter((id) => this.sg.graph.nodes.has(id) || this.sg.graph.edges.has(id))
    );
    for (const id of this.ids) if (!nextSet.has(id)) this.applyNodeState(id, false);
    for (const id of nextSet) if (!this.ids.has(id)) this.applyNodeState(id, true);
    this.ids.clear();
    for (const id of nextSet) this.ids.add(id);
    this.sg.events.emit('selection:changed', {
      ids: this.list,
      nodes: new Set(this.list),
      edges: new Set<string>(),
      timestamp: Date.now(),
    });
  }

  private applyNodeState(id: string, selected: boolean): void {
    const node = this.sg.graph.nodes.get(id);
    if (!node) return;
    node.controlState = selected ? 'selected' : 'normal';
    this.sg.events.emit('node:selection-changed', { id, selected });
  }
}
