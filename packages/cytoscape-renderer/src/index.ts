import {
  ModelRenderer,
  type DepthMode,
  type FitOptions,
  type GraphRenderer,
  type Projection,
  type RendererCapabilities,
  type RendererViewport,
  type RenderModel,
  type RenderModelPatch,
  type RenderTheme,
  type RenderNode,
  type RenderEdge,
  mergeRenderModelPatch,
} from '@spacegraphjs/renderer';
import type { Core } from 'cytoscape';
import { frameInRegion } from './fit';
import { cytoscapeStyle, edgeElement, nodeElement, normalizeTheme } from './mapping';

const CAPABILITIES: RendererCapabilities = {
  projections: ['2d'],
  depths: ['flat'],
  domNodes: true,
  maxDomNodes: 20,
  edgeLabels: true,
  clusterNodes: true,
  minimap: false,
  maxRecommendedNodes: 1000,
  zoomRange: { min: 0, max: Number.POSITIVE_INFINITY },
  cardFacing: false,
  fitInsets: true,
};

const FIT_MARGIN = 30;

// Wraps Cytoscape.js behind the dependency-free contract. It imports `@spacegraphjs/renderer` and
// `cytoscape` only; it never imports SpaceGraphJS core.
export class CytoscapeRenderer extends ModelRenderer implements GraphRenderer {
  readonly capabilities = CAPABILITIES;

  #cy: Core | null = null;
  #canvas: HTMLDivElement | null = null;
  #overlay: HTMLDivElement | null = null;
  #theme: RenderTheme | null = null;
  #cards = new Map<string, HTMLDivElement>();

  async mount(
    container: HTMLElement,
    options: { theme: RenderTheme; projection: Projection }
  ): Promise<void> {
    if (this.#cy) return;
    try {
      const { default: cytoscape } = await import('cytoscape');
      this.#theme = normalizeTheme(options.theme);
      const doc = container.ownerDocument;
      const view = doc.defaultView;
      if (view?.getComputedStyle(container).position === 'static') container.style.position = 'relative';

      const canvas = doc.createElement('div');
      canvas.style.cssText = 'position:absolute;inset:0;';
      const overlay = doc.createElement('div');
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
      if (this.model) this.setModel(this.model);
      this.emit('ready', undefined);
    } catch (error) {
      this.emit('error', { error });
      throw error;
    }
  }

  // Override setModel to use Cytoscape's batching pattern
  setModel(model: RenderModel): void {
    try {
      this.model = model;
      const cy = this.#cy;
      const theme = this.#theme;
      if (!cy || !theme) return;

      const liveNodes = new Set(model.nodes.map((node) => node.id));
      const liveEdges = new Set(model.edges.map((edge) => edge.id));

      cy.batch(() => {
        for (const id of this.nodes) if (!liveNodes.has(id)) cy.remove(cy.getElementById(id));
        for (const id of this.edges) if (!liveEdges.has(id)) cy.remove(cy.getElementById(id));

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

      this.nodes.clear();
      for (const id of liveNodes) this.nodes.add(id);
      this.edges.clear();
      for (const id of liveEdges) this.edges.add(id);

      this.#syncCards();
      this.#renderOverlay();
    } catch (error) {
      this.emit('error', { error });
    }
  }

  // Override applyPatch to use Cytoscape's batching pattern
  applyPatch(patch: RenderModelPatch): void {
    try {
      const cy = this.#cy;
      const theme = this.#theme;
      if (!cy || !theme || !this.model) return;

      cy.batch(() => {
        for (const id of patch.nodes.removed) {
          cy.remove(cy.getElementById(id));
          this.nodes.delete(id);
        }

        for (const node of patch.nodes.added) {
          const spec = nodeElement(node, theme);
          cy.add(spec);
          this.nodes.add(node.id);
        }

        for (const node of patch.nodes.changed) {
          const element = cy.getElementById(node.id);
          const spec = nodeElement(node, theme);
          if (!element.empty()) {
            element.data(spec.data);
            element.classes(spec.classes ?? []);
            element.position({ x: node.position[0], y: node.position[1] });
            element.style('display', node.visible === false ? 'none' : 'element');
          }
        }

        for (const id of patch.edges.removed) {
          cy.remove(cy.getElementById(id));
          this.edges.delete(id);
        }

        for (const edge of patch.edges.added) {
          const spec = edgeElement(edge, theme);
          cy.add(spec);
          this.edges.add(edge.id);
        }

        for (const edge of patch.edges.changed) {
          const element = cy.getElementById(edge.id);
          const spec = edgeElement(edge, theme);
          if (!element.empty()) {
            element.data(spec.data);
            element.classes(spec.classes ?? []);
          }
        }
      });

      this.model = mergeRenderModelPatch(this.model, patch);
      this.#syncCards();
      this.#renderOverlay();
    } catch (error) {
      this.emit('error', { error });
    }
  }

  protected getTheme(): RenderTheme | null {
    return this.#theme;
  }

  protected setThemeInternal(theme: RenderTheme): void {
    this.#theme = normalizeTheme(theme);
  }

  // Not used - setModel/applyPatch are overridden
  protected applyModel(_model: RenderModel, _theme: RenderTheme): void {}
  protected addNode(_node: RenderNode, _theme: RenderTheme): void {}
  protected updateNode(_node: RenderNode, _theme: RenderTheme): void {}
  protected removeNode(_id: string): void {}
  protected addEdge(_edge: RenderEdge, _theme: RenderTheme): void {}
  protected updateEdge(_edge: RenderEdge, _theme: RenderTheme): void {}
  protected removeEdge(_id: string): void {}
  protected setNodeVisibility(_id: string, _visible: boolean): void {}
  protected render(): void {}

  protected selectNodes(ids: readonly string[]): void {
    const cy = this.#cy;
    if (!cy) return;
    cy.elements().unselect();
    for (const id of ids) cy.getElementById(id).select();
  }

  protected applyViewport(viewport: RendererViewport): void {
    const cy = this.#cy;
    if (!cy) return;
    if (viewport.zoom) cy.zoom(viewport.zoom);
    if (viewport.center) {
      const el = cy.container();
      const zoom = cy.zoom();
      const width = el?.clientWidth ?? 0;
      const height = el?.clientHeight ?? 0;
      cy.pan({
        x: width / 2 - viewport.center[0] * zoom,
        y: -(height / 2 - viewport.center[1] * zoom),
      });
    }
    this.#renderOverlay();
  }

  protected readViewport(): RendererViewport | undefined {
    const cy = this.#cy;
    if (!cy) return undefined;

    const zoom = cy.zoom() || 1;
    const pan = cy.pan();
    const el = cy.container();
    const width = el?.clientWidth ?? 0;
    const height = el?.clientHeight ?? 0;

    const centerX = (width / 2 - pan.x) / zoom;
    const centerY = (height / 2 + pan.y) / zoom;

    return {
      zoom,
      center: [centerX, centerY, 0],
      extent: { width: width / zoom, height: height / zoom },
    };
  }

  protected readNodeScreenPosition(id: string): { x: number; y: number } | undefined {
    const cy = this.#cy;
    if (!cy) return undefined;

    const node = cy.getElementById(id);
    if (node.empty()) return undefined;

    const point = node.renderedPosition();
    return { x: point.x, y: point.y };
  }

  protected applyFit(ids?: readonly string[], options?: FitOptions): void {
    const cy = this.#cy;
    if (!cy) return;
    cy.resize();
    const elements = cy.collection();
    for (const id of ids ?? []) elements.merge(cy.getElementById(id));
    if (elements.length === 0) cy.fit();
    else cy.fit(elements);

    const framed = elements.length > 0 ? elements : cy.elements();
    const box = framed.boundingBox();
    if (!box) return;

    const minScale = options?.minScale;
    if (minScale !== undefined && cy.zoom() < minScale) {
      cy.zoom(minScale);
      cy.pan({ x: -box.x1 * minScale, y: -box.y1 * minScale });
    }

    const insets = options?.insets;
    const padding = options?.padding;
    if (padding === undefined && !insets) return;

    const surface = cy.container();
    const frame = frameInRegion({
      content: { x: box.x1, y: box.y1, width: box.w, height: box.h },
      surface: { width: surface?.clientWidth ?? 0, height: surface?.clientHeight ?? 0 },
      insets,
      padding,
      margin: FIT_MARGIN,
      minScale: options?.minScale,
    });
    if (!frame) return;

    cy.zoom(frame.zoom);
    cy.pan(frame.pan);
  }

  protected applyFocus(id: string): void {
    const cy = this.#cy;
    if (!cy) return;
    const element = cy.getElementById(id);
    if (element.empty()) return;
    cy.center(element);
  }

  protected cleanup(): void {
    this.#cy?.destroy();
    this.#cy = null;
    this.#canvas?.remove();
    this.#overlay?.remove();
    this.#canvas = null;
    this.#overlay = null;
    this.#cards.clear();
  }

  setTheme(theme: RenderTheme): void {
    this.#theme = normalizeTheme(theme);
    const cy = this.#cy;
    if (!cy) return;
    cy.style(cytoscapeStyle(this.#theme));
    if (this.model) this.setModel(this.model);
  }

  setProjection(_projection: Projection): void {}
  setDepth(_depth: DepthMode): void {}

  dispose(): void {
    this.cleanup();
    super.dispose();
  }

  #bind(): void {
    const cy = this.#cy!;
    cy.on('tap', 'node', (event) => this.emit('nodeClick', { id: event.target.id() }));
    cy.on('tap', 'edge', (event) => this.emit('edgeClick', { id: event.target.id() }));
    cy.on('tap', (event) => {
      if (event.target === cy) this.emit('backgroundClick', undefined);
    });
    cy.on('dbltap', 'node', (event) => this.emit('nodeDoubleClick', { id: event.target.id() }));
    cy.on('select unselect', () => {
      if (this.applyingSelection) return;
      this.emit('selectionChange', { ids: cy.$(':selected').map((element) => element.id()) });
    });
    cy.on('mouseover', 'node, edge', (event) =>
      this.emit('hoverChange', { id: event.target.id(), kind: event.target.isNode() ? 'node' : 'edge' })
    );
    cy.on('mouseout', 'node, edge', () => this.emit('hoverChange', { id: undefined }));
    cy.on('zoom pan resize', () => {
      this.#renderOverlay();
      const viewport = this.readViewport();
      if (viewport) this.emit('viewportChange', viewport);
    });
  }

  #syncCards(): void {
    const overlay = this.#overlay;
    const model = this.model;
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
      const element = (overlay.ownerDocument ?? document).createElement('div');
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
      element.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) scale(${cy.zoom()})`;
    }
  }
}

export { cytoscapeStyle, edgeElement, nodeElement, normalizeTheme } from './mapping';
export { CYTOSCAPE_THEME, CYTOSCAPE_TOKENS, CytoscapeThemeBridge } from './theme';
export type { GraphRenderer } from '@spacegraphjs/renderer';