import {
  BaseGraphRenderer,
  CONTRACT_VERSION,
  type CardFacing,
  type DepthMode,
  type FitOptions,
  type GraphRenderer,
  type Projection,
  type RendererCapabilities,
  type RendererViewport,
  type RenderModel,
  type RenderTheme,
  type Unsubscribe,
} from '@spacegraphjs/renderer';
import type { GraphSpec, SpaceGraph } from 'spacegraphjs/activity';
import { edgeSpec, nodeSpec, spaceGraphTheme } from './mapping';

const CAPABILITIES: RendererCapabilities = {
  contractVersion: CONTRACT_VERSION,
  projections: ['2d', '3d'],
  depths: ['flat', 'layered', 'depth-stack', 'orbit'],
  domNodes: true,
  maxDomNodes: 40,
  edgeLabels: true,
  clusterNodes: true,
  // The minimap is a chrome plugin pending L1.27; declare it unavailable rather than lie.
  minimap: false,
  maxRecommendedNodes: 300,
  // The core's zoom is normalized over the fitted band: 0 is the farthest the band allows and 1 the
  // closest. A host that zooms past 1 is asking for a zoom the renderer cannot deliver.
  zoomRange: { min: 0, max: 1 },
  // The core's DOM cards can face the camera or lie in the content plane, so a host can show the
  // raw perspective of a tilted camera.
  cardFacing: true,
  // The core's fit measures the surface it has and can keep the content clear of chrome the host
  // draws over the canvas.
  fitInsets: true,
};

// Wraps the lean SpaceGraphJS core behind the dependency-free contract. It is the only package that
// imports both the core and the contract; the core never imports the contract.
export class SpaceGraphRenderer extends BaseGraphRenderer implements GraphRenderer {
  readonly capabilities = CAPABILITIES;

  #sg: SpaceGraph | null = null;
  #theme: RenderTheme | null = null;
  #model: RenderModel | null = null;
  #nodes = new Set<string>();
  #edges = new Set<string>();
  #nodeTypes = new Map<string, string>();
  #disposers: Unsubscribe[] = [];
  #band: string | undefined;

  async mount(
    container: HTMLElement,
    options: { theme: RenderTheme; projection: Projection }
  ): Promise<void> {
    if (this.#sg) return;
    const { SpaceGraph } = await import('spacegraphjs/activity');
    this.#theme = options.theme;
    const ortho = options.projection === '2d';
    const sg = await SpaceGraph.create(container, { nodes: [], edges: [] }, {
      chrome: false,
      doubleClickFocus: false,
      render: {
        projection: ortho ? 'orthographic' : 'perspective',
        transparent: true,
        backgroundColor: options.theme.background,
        preserveDrawingBuffer: true,
      },
      theme: spaceGraphTheme(options.theme),
      cameraControls: { enableRotate: !ortho },
    });
    this.#sg = sg;
    this.#bind();
    this.#applyDepth(options.projection === '2d' ? 'flat' : 'orbit');
    if (this.#model) this.setModel(this.#model);
    this.emit('ready', undefined);
  }

  setModel(model: RenderModel): void {
    this.#model = model;
    const sg = this.#sg;
    const theme = this.#theme;
    if (!sg || !theme) return;

    const liveNodes = new Set(model.nodes.map((n) => n.id));
    const nodes = model.nodes.map((node) => nodeSpec(node, theme));

    // Semantic zoom changes a node's representation (a phase is a panel at execution and a counted chip
    // at overview). The core upserts by id and never remodels, so drop any node whose spec type changed
    // first; loadSpec then recreates it with the new type.
    for (const node of nodes) {
      const previous = this.#nodeTypes.get(node.id);
      if (previous && previous !== node.type) sg.removeNode(node.id);
      this.#nodeTypes.set(node.id, node.type);
    }

    for (const id of this.#nodes) {
      if (!liveNodes.has(id)) {
        sg.removeNode(id);
        this.#nodeTypes.delete(id);
      }
    }
    this.#nodes = liveNodes;

    const liveEdges = new Set(model.edges.map((e) => e.id));
    for (const id of this.#edges) {
      if (!liveEdges.has(id)) sg.removeEdge(id);
    }
    this.#edges = liveEdges;

    const spec: GraphSpec = {
      nodes,
      edges: model.edges.map((edge) => edgeSpec(edge, theme)),
    };
    sg.loadSpec(spec);
    sg.setPositions(Object.fromEntries(model.nodes.map((node) => [node.id, node.position])));

    for (const node of model.nodes) {
      if (node.visible === false) sg.hide(node.id);
      else sg.show(node.id);
    }
    sg.render();
  }

  setTheme(theme: RenderTheme): void {
    this.#theme = theme;
    if (this.#sg) this.#sg.options.theme = spaceGraphTheme(theme);
    if (this.#model) this.setModel(this.#model);
  }

  setProjection(projection: Projection): void {
    // Projection is the coarse depth selection: 2D is the flat baseline, 3D is the orbit experiment.
    this.#applyDepth(projection === '2d' ? 'flat' : 'orbit');
  }

  setDepth(depth: DepthMode): void {
    this.#applyDepth(depth);
  }

  // The core owns the camera and the cards; the adapter only translates the request.
  setCardFacing(facing: CardFacing): void {
    this.#sg?.setCardFacing(facing);
  }

  // The core owns camera framing and depth treatment (contract rule 1); the adapter only translates the
  // requested depth into the core call.
  #applyDepth(depth: DepthMode): void {
    this.#sg?.setDepth(depth);
  }

  setSelection(ids: readonly string[]): void {
    const sg = this.#sg;
    if (!sg) return;
    this.applySelection(ids, () => {
      if (ids.length === 0) sg.clearSelection();
      else sg.select([...ids]);
    });
  }

  setViewport(viewport: RendererViewport): void {
    this.#sg?.setZoom(viewport.zoom);
    if (viewport.center) {
      const [x, y, z] = viewport.center;
      this.#sg?.cameraControls?.setTarget(x, y, z);
    }
  }

  // The camera's frame, read back from the core. A host that must place the camera exactly (a
  // permalink, a reduced-motion jump, a capture) reads it here instead of assuming a zoom.
  getViewport(): RendererViewport {
    const sg = this.#sg;
    if (!sg) return { zoom: 1, center: [0, 0, 0] };

    const viewport = sg.viewport;
    return {
      zoom: viewport.zoom,
      center: viewport.center,
      extent: viewport.extent,
      band: viewport.band,
    };
  }

  // Programmatic framing is immediate (duration 0): a deterministic jump rather than an animation the
  // host cannot sequence. The renderer owns framing per contract rule 1, and a still frame after a fit
  // is what the capture waits on (LE.1).
  fit(ids?: readonly string[], options?: FitOptions): void {
    this.#sg?.fitView(options?.padding ?? 100, 0, ids, {
      minScale: options?.minScale,
      insets: options?.insets
        ? {
            top: options.insets.top ?? 0,
            right: options.insets.right ?? 0,
            bottom: options.insets.bottom ?? 0,
            left: options.insets.left ?? 0,
          }
        : undefined,
    });
  }

  focus(id: string): void {
    this.#sg?.focusNode(id);
  }

  resize(): void {
    this.#sg?.render();
  }

  dispose(): void {
    for (const off of this.#disposers) off();
    this.#disposers = [];
    this.events.clear();
    this.#sg?.dispose();
    this.#sg = null;
    this.#nodes.clear();
    this.#edges.clear();
    this.#nodeTypes.clear();
  }

  #bind(): void {
    const sg = this.#sg!;
    const on = (type: string, handler: (payload: unknown) => void) => {
      sg.events.on(type, handler);
      this.#disposers.push(() => sg.events.off(type, handler));
    };
    on('node:click', (payload) => this.emit('nodeClick', { id: idOf(payload) }));
    on('edge:click', (payload) => this.emit('edgeClick', { id: idOf(payload) }));
    on('background:click', () => this.emit('backgroundClick', undefined));
    on('node:dblclick', (payload) => this.emit('nodeDoubleClick', { id: idOf(payload) }));
    on('selection:changed', (payload) => {
      if (this.applyingSelection) return;
      this.emit('selectionChange', { ids: idsOf(payload) });
    });
    on('camera:change', (payload) => this.#emitViewport(payload as RendererViewport));
  }

  #emitViewport(viewport: RendererViewport): void {
    this.emit('viewportChange', {
      zoom: viewport.zoom,
      center: viewport.center,
      extent: viewport.extent,
      band: viewport.band,
    });
    if (viewport.band && viewport.band !== this.#band) {
      this.#band = viewport.band;
      this.emit('bandChange', { band: viewport.band, zoom: viewport.zoom });
    }
  }
}

function idOf(payload: unknown): string {
  return (payload as { id?: string } | undefined)?.id ?? '';
}

function idsOf(payload: unknown): readonly string[] {
  return (payload as { ids?: readonly string[] } | undefined)?.ids ?? [];
}

export { edgeSpec, nodeSpec, parseColor, spaceGraphTheme, statusColor } from './mapping';
export { RENDERER_THEME, resolveRendererTheme } from './theme';
export type { GraphRenderer } from '@spacegraphjs/renderer';
