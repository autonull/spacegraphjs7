import {
  CONTRACT_VERSION,
  type DepthMode,
  type GraphRenderer,
  type Projection,
  type RendererCapabilities,
  type RendererEventMap,
  type RendererViewport,
  type RenderModel,
  type RenderTheme,
  type Unsubscribe,
} from '@spacegraphjs/renderer';
import type { Core } from 'cytoscape';
import { cytoscapeStyle, edgeElement, nodeElement, normalizeTheme } from './mapping';

const CAPABILITIES: RendererCapabilities = {
  contractVersion: CONTRACT_VERSION,
  // Cytoscape is the 2D fallback: only the flat depth, no 3D, no minimap. Cards render through a
  // capped DOM overlay.
  projections: ['2d'],
  depths: ['flat'],
  domNodes: true,
  maxDomNodes: 20,
  edgeLabels: true,
  clusterNodes: true,
  minimap: false,
  maxRecommendedNodes: 1000,
};

type Handler<K extends keyof RendererEventMap> = (payload: RendererEventMap[K]) => void;

// Wraps Cytoscape.js behind the dependency-free contract. It imports `@spacegraphjs/renderer` and
// `cytoscape` only; it never imports SpaceGraphJS core.
export class CytoscapeRenderer implements GraphRenderer {
  readonly capabilities = CAPABILITIES;

  #cy: Core | null = null;
  #canvas: HTMLDivElement | null = null;
  #overlay: HTMLDivElement | null = null;
  #theme: RenderTheme | null = null;
  #model: RenderModel | null = null;
  #nodes = new Set<string>();
  #edges = new Set<string>();
  #cards = new Map<string, HTMLDivElement>();
  #handlers = new Map<keyof RendererEventMap, Set<Handler<never>>>();
  #applyingSelection = false;

  async mount(
    container: HTMLElement,
    options: { theme: RenderTheme; projection: Projection }
  ): Promise<void> {
    if (this.#cy) return;
    const { default: cytoscape } = await import('cytoscape');
    this.#theme = normalizeTheme(options.theme);
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    const canvas = document.createElement('div');
    canvas.style.cssText = 'position:absolute;inset:0;';
    const overlay = document.createElement('div');
    overlay.dataset.slot = 'cytoscape-cards';
    overlay.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;';
    container.append(canvas, overlay);
    this.#canvas = canvas;
    this.#overlay = overlay;

    const cy = cytoscape({
      container: canvas,
      elements: [],
      style: cytoscapeStyle(this.#theme),
      layout: { name: 'preset', fit: false },
      wheelSensitivity: 0.2,
    });
    this.#cy = cy;
    this.#bind();
    if (this.#model) this.setModel(this.#model);
    this.#emit('ready', undefined);
  }

  setModel(model: RenderModel): void {
    this.#model = model;
    const cy = this.#cy;
    const theme = this.#theme;
    if (!cy || !theme) return;

    const liveNodes = new Set(model.nodes.map((node) => node.id));
    const liveEdges = new Set(model.edges.map((edge) => edge.id));

    cy.batch(() => {
      for (const id of this.#edges) if (!liveEdges.has(id)) cy.remove(cy.getElementById(id));
      for (const id of this.#nodes) if (!liveNodes.has(id)) cy.remove(cy.getElementById(id));

      for (const node of model.nodes) {
        const element = cy.getElementById(node.id);
        const spec = nodeElement(node, theme);
        if (element.empty()) cy.add(spec);
        else {
          element.data(spec.data);
          element.classes(spec.classes ?? []);
          element.position({ x: node.position[0], y: node.position[1] });
        }
        element.style('display', node.visible === false ? 'none' : 'element');
      }

      for (const edge of model.edges) {
        const element = cy.getElementById(edge.id);
        const spec = edgeElement(edge, theme);
        if (element.empty()) cy.add(spec);
        else {
          element.data(spec.data);
          element.classes(spec.classes ?? []);
        }
      }
    });

    this.#nodes = liveNodes;
    this.#edges = liveEdges;
    this.#syncCards();
    this.#renderOverlay();
  }

  setTheme(theme: RenderTheme): void {
    this.#theme = normalizeTheme(theme);
    const cy = this.#cy;
    if (!cy) return;
    cy.style(cytoscapeStyle(this.#theme));
    if (this.#model) this.setModel(this.#model);
  }

  setProjection(_projection: Projection): void {
    // 2D only; the capability declares no 3D so the host disables that affordance.
  }

  setDepth(_depth: DepthMode): void {
    // Only the flat treatment is supported; the capability declares the rest so the host disables them.
  }

  setSelection(ids: readonly string[]): void {
    const cy = this.#cy;
    if (!cy) return;
    this.#applyingSelection = true;
    try {
      cy.elements().unselect();
      for (const id of ids) cy.getElementById(id).select();
    } finally {
      this.#applyingSelection = false;
    }
  }

  setViewport(viewport: RendererViewport): void {
    const cy = this.#cy;
    if (!cy) return;
    if (viewport.zoom) cy.zoom(viewport.zoom);
    if (viewport.center) {
      const el = cy.container();
      const zoom = cy.zoom();
      const width = el?.clientWidth ?? 0;
      const height = el?.clientHeight ?? 0;
      cy.pan({ x: width / 2 - viewport.center[0] * zoom, y: height / 2 - viewport.center[1] * zoom });
    }
    this.#renderOverlay();
  }

  fit(ids?: readonly string[]): void {
    const cy = this.#cy;
    if (!cy) return;
    if (!ids || ids.length === 0) {
      cy.fit();
      return;
    }
    const elements = cy.collection();
    for (const id of ids) elements.merge(cy.getElementById(id));
    if (elements.length === 0) cy.fit();
    else cy.fit(elements);
  }

  focus(id: string): void {
    this.#cy?.center(this.#cy.getElementById(id));
  }

  resize(): void {
    this.#cy?.resize();
    this.#renderOverlay();
  }

  on<K extends keyof RendererEventMap>(event: K, handler: Handler<K>): Unsubscribe {
    const set = this.#handlers.get(event) ?? new Set<Handler<never>>();
    set.add(handler as Handler<never>);
    this.#handlers.set(event, set);
    return () => set.delete(handler as Handler<never>);
  }

  dispose(): void {
    this.#cy?.destroy();
    this.#cy = null;
    this.#canvas?.remove();
    this.#overlay?.remove();
    this.#canvas = null;
    this.#overlay = null;
    this.#cards.clear();
    this.#handlers.clear();
    this.#model = null;
    this.#nodes.clear();
    this.#edges.clear();
  }

  #bind(): void {
    const cy = this.#cy!;
    cy.on('tap', 'node', (event) => this.#emit('nodeClick', { id: event.target.id() }));
    cy.on('tap', 'edge', (event) => this.#emit('edgeClick', { id: event.target.id() }));
    cy.on('tap', (event) => {
      if (event.target === cy) this.#emit('backgroundClick', undefined);
    });
    cy.on('dbltap', 'node', (event) => this.#emit('nodeDoubleClick', { id: event.target.id() }));
    cy.on('select unselect', () => {
      if (this.#applyingSelection) return;
      this.#emit('selectionChange', { ids: cy.$(':selected').map((element) => element.id()) });
    });
    cy.on('mouseover', 'node, edge', (event) =>
      this.#emit('hoverChange', { id: event.target.id(), kind: event.target.isNode() ? 'node' : 'edge' })
    );
    cy.on('mouseout', 'node, edge', () => this.#emit('hoverChange', { id: undefined }));
    cy.on('zoom pan resize', () => {
      this.#renderOverlay();
      this.#emitViewport();
    });
  }

  #emitViewport(): void {
    const cy = this.#cy;
    if (!cy) return;
    const zoom = cy.zoom();
    const pan = cy.pan();
    const el = cy.container();
    const width = el?.clientWidth ?? 0;
    const height = el?.clientHeight ?? 0;
    this.#emit('viewportChange', {
      zoom,
      center: [(width / 2 - pan.x) / zoom, (height / 2 - pan.y) / zoom, 0],
      extent: { width: width / zoom, height: height / zoom },
    });
  }

  #syncCards(): void {
    const overlay = this.#overlay;
    const model = this.#model;
    if (!overlay || !model) return;
    const cards = model.nodes
      .filter((node) => node.html && node.visible !== false)
      .slice(0, this.capabilities.maxDomNodes);
    const wanted = new Set(cards.map((node) => node.id));
    const direction = this.#theme?.direction ?? '';

    for (const node of cards) {
      const existing = this.#cards.get(node.id);
      if (existing) {
        if (existing.innerHTML !== node.html) existing.innerHTML = node.html!;
        if (existing.dir !== direction) existing.dir = direction;
        continue;
      }
      const element = document.createElement('div');
      element.dataset.slot = 'cytoscape-card';
      element.dataset.node = node.id;
      if (direction) element.dir = direction;
      element.style.cssText =
        'position:absolute;top:0;left:0;transform-origin:center;pointer-events:auto;will-change:transform;';
      element.innerHTML = node.html!;
      overlay.append(element);
      this.#cards.set(node.id, element);
    }

    for (const [id, element] of this.#cards) {
      if (!wanted.has(id)) {
        element.remove();
        this.#cards.delete(id);
      }
    }
  }

  #renderOverlay(): void {
    const cy = this.#cy;
    if (!cy) return;
    for (const [id, element] of this.#cards) {
      const node = cy.getElementById(id);
      if (node.empty()) continue;
      const point = node.renderedPosition();
      element.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
    }
  }

  #emit<K extends keyof RendererEventMap>(event: K, payload: RendererEventMap[K]): void {
    for (const handler of this.#handlers.get(event) ?? new Set<Handler<never>>()) {
      (handler as Handler<K>)(payload);
    }
  }
}

export { cytoscapeStyle, edgeElement, nodeElement, statusColor } from './mapping';
export type { GraphRenderer } from '@spacegraphjs/renderer';
