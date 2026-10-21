// P8.1 — a framework-agnostic view controller. It owns the interaction state a graph host shares
// across frameworks: selection, focus, the navigation trail, zoom bands, and search. It talks to a
// renderer through a minimal structural surface and to an application through a minimal node/edge
// shape, so the core never imports the renderer contract. A framework binding observes `onChange` and
// re-renders; the host supplies the detail panel.

import { Trail, type TrailNode, type TrailOptions } from '../navigation';
import { searchBy } from '../navigation/search';
import { ZoomBands, type ZoomBand, type ZoomBandChange, type ZoomBandsConfig } from '../zoom';

export type ControlProjection = '2d' | '3d';

/** Minimal node shape. Structurally compatible with the contract's `RenderNode` (extra fields are fine). */
export interface ControlNode {
  id: string;
  label: string;
  kind?: string;
  summary?: string;
  status?: string;
  interactive?: boolean;
}

/** Minimal edge shape. Structurally compatible with the contract's `RenderEdge`. */
export interface ControlEdge {
  id: string;
  source: string;
  target: string;
  kind?: string;
  label?: string;
  confidence?: string;
}

export interface ControlModel {
  nodes: readonly ControlNode[];
  edges: readonly ControlEdge[];
}

export interface ControlViewport {
  zoom: number;
  center: [number, number, number];
  extent?: { width: number; height: number };
  band?: string;
}

/** Events the controller consumes from a renderer. A superset renderer (a contract adapter) satisfies it. */
export interface ControlEventMap {
  selectionChange: { ids: readonly string[] };
  viewportChange: ControlViewport;
  nodeClick: { id: string };
  edgeClick: { id: string };
  nodeDoubleClick: { id: string };
  backgroundClick: void;
}

/** The renderer surface the controller needs; the host keeps ownership of the model and the camera. */
export interface ControlRenderer {
  setSelection(ids: readonly string[]): void;
  fit(ids?: readonly string[]): void;
  focus(id: string): void;
  on<K extends keyof ControlEventMap>(event: K, handler: (payload: ControlEventMap[K]) => void): () => void;
  dispose?(): void;
}

export interface Connection {
  edge: ControlEdge;
  node: ControlNode;
}

export interface ControlSnapshot {
  selection: readonly string[];
  trail: readonly TrailNode[];
  band: string;
  zoom: number;
}

export type ControlListener = (snapshot: ControlSnapshot) => void;

export interface GraphControllerOptions {
  bands?: readonly ZoomBand[] | ZoomBandsConfig;
  trailMaxDepth?: number;
  selection?: readonly string[];
}

const DEFAULT_BANDS: readonly ZoomBand[] = [{ id: 'all', min: 0, max: 1 }];

// The controller is a plain state machine: it holds the model, derives all ids once per model, and
// emits a snapshot whenever selection, trail, or band changes. Nothing here touches the DOM.
export class GraphController {
  readonly #bands: ZoomBands;
  readonly #trail: Trail;
  readonly #listeners = new Set<ControlListener>();
  #model: ControlModel = { nodes: [], edges: [] };
  #nodesById = new Map<string, ControlNode>();
  #connectionsById = new Map<string, Connection[]>();
  #selection: readonly string[] = [];
  #renderer: ControlRenderer | undefined;
  #unsubscribers: (() => void)[] = [];
  #disposed = false;

  constructor(options: GraphControllerOptions = {}) {
    const bands = options.bands ?? DEFAULT_BANDS;
    this.#bands = new ZoomBands(Array.isArray(bands) ? { bands } : (bands as ZoomBandsConfig));
    this.#trail = new Trail({ maxDepth: options.trailMaxDepth });
    this.#trail.onChange(() => this.#emit());
    this.#bands.onChange(() => this.#emit());
    this.#selection = [...(options.selection ?? [])];
  }

  get model(): ControlModel {
    return this.#model;
  }

  get selection(): readonly string[] {
    return this.#selection;
  }

  get selectedNode(): ControlNode | undefined {
    return this.#selection[0] ? this.#nodesById.get(this.#selection[0]) : undefined;
  }

  get trail(): Trail {
    return this.#trail;
  }

  get bands(): ZoomBands {
    return this.#bands;
  }

  get band(): string {
    return this.#bands.band;
  }

  get zoom(): number {
    return this.#bands.snapshot().zoom;
  }

  // Adopt a renderer and forward its selection/viewport/focus events into controller state. Rebinding
  // disposes the previous subscriptions; the controller never owns the renderer's lifecycle.
  bind(renderer: ControlRenderer): this {
    this.unbind();
    this.#renderer = renderer;
    this.#unsubscribers = [
      renderer.on('selectionChange', ({ ids }) => this.#apply(ids, false, true)),
      renderer.on('nodeClick', ({ id }) => this.select(id)),
      renderer.on('nodeDoubleClick', ({ id }) => this.focus(id)),
      renderer.on('backgroundClick', () => this.clear()),
      renderer.on('viewportChange', (viewport) => this.feedNormalized(viewport.zoom, viewport.zoom)),
    ];
    renderer.setSelection(this.#selection);
    return this;
  }

  unbind(): this {
    for (const unsubscribe of this.#unsubscribers) unsubscribe();
    this.#unsubscribers = [];
    this.#renderer = undefined;
    return this;
  }

  // Install a new model. Selection is filtered to ids that still exist and the trail reconciles by id,
  // so streaming appends never clear the selection or the breadcrumbs.
  setModel(model: ControlModel): void {
    this.#model = model;
    this.#nodesById = new Map(model.nodes.map((node) => [node.id, node]));
    this.#connectionsById = new Map();
    for (const edge of model.edges) {
      const source = this.#nodesById.get(edge.source);
      const target = this.#nodesById.get(edge.target);
      if (source && target) {
        this.#addConnection(edge.source, { edge, node: target });
        this.#addConnection(edge.target, { edge, node: source });
      }
    }
    this.#selection = this.#selection.filter((id) => this.#nodesById.has(id));
    this.#renderer?.setSelection(this.#selection);
    this.#trail.reconcile(this.#nodesById);
    this.#emit();
  }

  select(ids: string | readonly string[] | null, record = true): void {
    this.#apply(ids == null ? [] : typeof ids === 'string' ? [ids] : ids, true, record);
  }

  toggle(id: string): void {
    this.select(this.#selection.includes(id) ? this.#selection.filter((current) => current !== id) : [...this.#selection, id]);
  }

  clear(): void {
    this.select(null, false);
  }

  focus(id?: string): void {
    const target = id ?? this.#selection[0];
    if (target) this.#renderer?.focus(target);
  }

  fit(ids?: readonly string[]): void {
    this.#renderer?.fit(ids);
  }

  back(): void {
    const entry = this.#trail.back();
    if (entry) this.#apply([entry.id], true, false);
  }

  forward(): void {
    const entry = this.#trail.forward();
    if (entry) this.#apply([entry.id], true, false);
  }

  // Feed a normalized zoom directly (hosts with no renderer, e.g. a static SVG preview).
  feedNormalized(normalized: number, raw = normalized): void {
    this.#bands.feedNormalized(normalized, raw);
  }

  search(query: string, limit = 8): ControlNode[] {
    return searchBy(this.#model, query, (node, needle) => this.#score(node, needle), limit);
  }

  connections(id: string): readonly Connection[] {
    return this.#connectionsById.get(id) ?? [];
  }

  snapshot(): ControlSnapshot {
    return {
      selection: this.#selection,
      trail: this.#trail.entries,
      band: this.#bands.band,
      zoom: this.#bands.snapshot().zoom,
    };
  }

  onChange(listener: ControlListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.unbind();
    this.#listeners.clear();
  }

  // Apply a selection. `toRenderer` is false when the renderer already holds this selection (a user
  // event), which avoids echoing it back and looping. A single recorded selection extends the trail.
  #apply(ids: readonly string[], toRenderer: boolean, record: boolean): void {
    this.#selection = [...new Set(ids)].filter((id) => this.#nodesById.has(id));
    if (toRenderer) this.#renderer?.setSelection(this.#selection);
    if (record && this.#selection.length === 1) {
      const node = this.#nodesById.get(this.#selection[0]!);
      if (node) this.#trail.push({ id: node.id, label: node.label, kind: node.kind });
    }
    this.#emit();
  }

  #score(node: ControlNode, needle: string): number {
    const label = node.label.toLowerCase();
    if (label.startsWith(needle)) return 0;
    if (label.includes(needle)) return 1;
    if (node.summary?.toLowerCase().includes(needle)) return 2;
    if (node.kind?.toLowerCase().includes(needle)) return 3;
    if (node.id.toLowerCase().includes(needle)) return 4;
    return -1;
  }

  #addConnection(id: string, connection: Connection): void {
    const list = this.#connectionsById.get(id);
    if (list) list.push(connection);
    else this.#connectionsById.set(id, [connection]);
  }

  #emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.#listeners) listener(snapshot);
  }
}

export type { TrailNode, ZoomBand, ZoomBandChange, ZoomBandsConfig, TrailOptions };
