import {
  CONTRACT_VERSION,
  type GraphRenderer,
  type Projection,
  type RendererCapabilities,
  type RendererEventMap,
  type RendererViewport,
  type RenderModel,
  type RenderTheme,
  type Unsubscribe,
} from '@spacegraphjs/renderer';
import type { GraphSpec, SpaceGraph } from 'spacegraphjs/activity';
import { edgeSpec, nodeSpec } from './mapping';

const CAPABILITIES: RendererCapabilities = {
  contractVersion: CONTRACT_VERSION,
  projections: ['2d', '3d'],
  domNodes: true,
  maxDomNodes: 40,
  edgeLabels: true,
  clusterNodes: true,
  // The minimap is a chrome plugin pending L1.27; declare it unavailable rather than lie.
  minimap: false,
  maxRecommendedNodes: 300,
};

// Camera polar angles (from +Y). FLAT looks straight down the graph plane (the 2D baseline);
// TILT raises the camera ~29° so the hierarchy Z reads as depth in 3D.
const FLAT_PHI = Math.PI / 2;
const TILT_PHI = Math.PI / 2 - 0.5;

type Handler<K extends keyof RendererEventMap> = (payload: RendererEventMap[K]) => void;
type CoreViewport = {
  zoom: number;
  center: [number, number, number];
  extent?: { width: number; height: number };
  band?: string;
};

// Wraps the lean SpaceGraphJS core behind the dependency-free contract. It is the only package that
// imports both the core and the contract; the core never imports the contract.
export class SpaceGraphRenderer implements GraphRenderer {
  readonly capabilities = CAPABILITIES;

  #sg: SpaceGraph | null = null;
  #theme: RenderTheme | null = null;
  #model: RenderModel | null = null;
  #nodes = new Set<string>();
  #edges = new Set<string>();
  #handlers = new Map<keyof RendererEventMap, Set<Handler<never>>>();
  #disposers: Unsubscribe[] = [];
  #applyingSelection = false;
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
      theme: { background: options.theme.background },
      cameraControls: { enableRotate: !ortho },
    });
    this.#sg = sg;
    this.#bind();
    this.#applyProjection(options.projection);
    if (this.#model) this.setModel(this.#model);
    this.#emit('ready', undefined);
  }

  setModel(model: RenderModel): void {
    this.#model = model;
    const sg = this.#sg;
    const theme = this.#theme;
    if (!sg || !theme) return;

    const liveNodes = new Set(model.nodes.map((n) => n.id));
    for (const id of this.#nodes) {
      if (!liveNodes.has(id)) sg.removeNode(id);
    }
    this.#nodes = liveNodes;

    const liveEdges = new Set(model.edges.map((e) => e.id));
    for (const id of this.#edges) {
      if (!liveEdges.has(id)) sg.removeEdge(id);
    }
    this.#edges = liveEdges;

    const spec: GraphSpec = {
      nodes: model.nodes.map((node) => nodeSpec(node, theme)),
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
    if (this.#model) this.setModel(this.#model);
  }

  setProjection(projection: Projection): void {
    if (!this.#sg) return;
    this.#sg.setProjection(projection === '2d' ? 'orthographic' : 'perspective');
    this.#applyProjection(projection);
  }

  // A flat top-down pose is the legible 2D baseline; 3D tilts the camera so the hierarchy Z reads as
  // depth, and only 3D orbits. The renderer owns camera framing and animation (contract rule 1).
  #applyProjection(projection: Projection): void {
    const sg = this.#sg;
    if (!sg) return;
    const perspective = projection === '3d';
    sg.setOrbitEnabled(perspective);
    sg.setPolar(perspective ? TILT_PHI : FLAT_PHI, 0, 0.5);
  }

  setSelection(ids: readonly string[]): void {
    const sg = this.#sg;
    if (!sg) return;
    this.#applyingSelection = true;
    try {
      if (ids.length === 0) sg.clearSelection();
      else sg.select([...ids]);
    } finally {
      this.#applyingSelection = false;
    }
  }

  setViewport(viewport: RendererViewport): void {
    this.#sg?.setZoom(viewport.zoom);
    if (viewport.center) {
      const [x, y, z] = viewport.center;
      this.#sg?.cameraControls?.setTarget(x, y, z);
    }
  }

  fit(_ids?: readonly string[]): void {
    this.#sg?.fitView();
  }

  focus(id: string): void {
    this.#sg?.focusNode(id);
  }

  resize(): void {
    this.#sg?.render();
  }

  on<K extends keyof RendererEventMap>(event: K, handler: Handler<K>): Unsubscribe {
    const set = this.#handlers.get(event) ?? new Set<Handler<never>>();
    set.add(handler as Handler<never>);
    this.#handlers.set(event, set);
    return () => set.delete(handler as Handler<never>);
  }

  dispose(): void {
    for (const off of this.#disposers) off();
    this.#disposers = [];
    this.#handlers.clear();
    this.#sg?.dispose();
    this.#sg = null;
    this.#nodes.clear();
    this.#edges.clear();
  }

  #bind(): void {
    const sg = this.#sg!;
    const on = (type: string, handler: (payload: unknown) => void) => {
      sg.events.on(type, handler);
      this.#disposers.push(() => sg.events.off(type, handler));
    };
    on('node:click', (payload) => this.#emit('nodeClick', { id: idOf(payload) }));
    on('edge:click', (payload) => this.#emit('edgeClick', { id: idOf(payload) }));
    on('background:click', () => this.#emit('backgroundClick', undefined));
    on('node:dblclick', (payload) => this.#emit('nodeDoubleClick', { id: idOf(payload) }));
    on('selection:changed', (payload) => {
      if (this.#applyingSelection) return;
      this.#emit('selectionChange', { ids: idsOf(payload) });
    });
    on('camera:change', (payload) => this.#emitViewport(payload as CoreViewport));
  }

  #emitViewport(viewport: CoreViewport): void {
    this.#emit('viewportChange', {
      zoom: viewport.zoom,
      center: viewport.center,
      extent: viewport.extent,
      band: viewport.band,
    });
    if (viewport.band && viewport.band !== this.#band) {
      this.#band = viewport.band;
      this.#emit('bandChange', { band: viewport.band, zoom: viewport.zoom });
    }
  }

  #emit<K extends keyof RendererEventMap>(event: K, payload: RendererEventMap[K]): void {
    for (const handler of this.#handlers.get(event) ?? new Set<Handler<never>>()) {
      (handler as Handler<K>)(payload);
    }
  }
}

function idOf(payload: unknown): string {
  return (payload as { id?: string } | undefined)?.id ?? '';
}

function idsOf(payload: unknown): readonly string[] {
  return (payload as { ids?: readonly string[] } | undefined)?.ids ?? [];
}

export { edgeSpec, nodeSpec, parseColor, statusColor } from './mapping';
export type { GraphRenderer } from '@spacegraphjs/renderer';
