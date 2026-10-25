/**
 * `@spacegraphjs/renderer` — the renderer contract.
 *
 * Types and tiny helpers only. Zero runtime dependencies, no `three`, no `cytoscape`, no core import.
 * A host builds a `RenderModel`, a renderer adapter renders it, and the two never share library objects.
 */

export type Projection = '2d' | '3d'

/**
 * LE.14 — depth is a spectrum, not a 2D/3D toggle. `flat` is the orthographic baseline; `layered` and
 * `depth-stack` add depth ordering under a shallow camera; `orbit` is the free-perspective experiment.
 */
export type DepthMode = 'flat' | 'layered' | 'depth-stack' | 'orbit'

/** Canonical depth order, shallowest first; hosts render choosers in this order. */
export const DEPTH_MODES: readonly DepthMode[] = ['flat', 'layered', 'depth-stack', 'orbit']

/**
 * How the DOM cards face the camera. `plane` lays every card in the content plane, so a tilted
 * camera shears them — that shear is the perspective working, not a defect. `camera` turns them to
 * face the reader, which is what a legible tilted view needs. `auto` follows the depth treatment.
 */
export type CardFacing = 'auto' | 'plane' | 'camera'

export type NodeStatus = 'neutral' | 'pending' | 'running' | 'success' | 'warning' | 'error'

export type RenderNode = {
  id: string
  kind: string
  label: string
  summary?: string
  /** Host-sanitized markup for `shape: "card"`. Never fetched or evaluated by the renderer. */
  html?: string
  position: [number, number, number]
  size?: [number, number, number]
  status?: NodeStatus
  visible?: boolean
  interactive?: boolean
  shape?: 'card' | 'panel' | 'dot' | 'badge' | 'group'
  /** The group this node belongs to. A group node may itself name a parent group. */
  parent?: string
  data?: Record<string, unknown>
}

export type RenderEdge = {
  id: string
  source: string
  target: string
  kind: string
  label?: string
  confidence?: 'explicit' | 'structural' | 'inferred'
  visible?: boolean
  directed?: boolean
  style?: 'solid' | 'dashed' | 'dotted'
}

export type RenderModel = {
  nodes: readonly RenderNode[]
  edges: readonly RenderEdge[]
  extent?: { width: number; height: number; depth?: number }
}

/** Incremental patch for updating a render model. */
export type RenderModelPatch = {
  /** Nodes that changed. */
  nodes: {
    /** Nodes the next model adds. */
    added: readonly RenderNode[]
    /** Node ids the next model drops. */
    removed: readonly string[]
    /** Nodes that stay but carry different content. */
    changed: readonly RenderNode[]
  }
  /** Edges that changed. */
  edges: {
    /** Edges the next model adds. */
    added: readonly RenderEdge[]
    /** Edge ids the next model drops. */
    removed: readonly string[]
    /** Edges that stay but carry different content. */
    changed: readonly RenderEdge[]
  }
}

export type RenderTheme = {
  background: string
  surface: string
  surfaceMuted: string
  text: string
  textMuted: string
  border: string
  accent: string
  success: string
  warning: string
  error: string
  edge: string
  edgeMuted: string
  selection: string
  focus: string
  fontFamily: string
  fontSize: number
  direction?: 'ltr' | 'rtl'
}

export type RendererCapabilities = {
  projections: readonly Projection[]
  /** Depth treatments this renderer can honour, in `DepthMode` terms. */
  depths: readonly DepthMode[]
  domNodes: boolean
  maxDomNodes: number
  edgeLabels: boolean
  clusterNodes: boolean
  minimap: boolean
  maxRecommendedNodes: number
  /**
   * The viewport zoom values this renderer accepts, in the renderer's own zoom scale. A host clamps
   * its zoom control to the range and disables the control at the ends, so the reader is never
   * offered a zoom the renderer cannot deliver — and a control that stops responding says so.
   *
   * Optional: a renderer that leaves it out is bounded by the host's own policy alone.
   */
  zoomRange?: { min: number; max: number }
  /**
   * The renderer can change how the DOM cards face the camera. A renderer that draws its cards in
   * screen space, or has no camera at all, leaves it out — and a host hides the control rather than
   * offering one the renderer cannot honour.
   */
  cardFacing?: boolean
  /**
   * The renderer can frame content inside screen-space insets (`fit` with `insets`). Optional: a
   * renderer that cannot leaves it out, and a host reads that as "not honoured" — the frame simply
   * fills the surface — rather than as a broken camera.
   */
  fitInsets?: boolean
}

export type RendererViewport = {
  zoom: number
  center: [number, number, number]
  /** Visible world extent in the graph's XY plane, when the renderer can report it (host minimaps). */
  extent?: { width: number; height: number }
  band?: string
}

/**
 * Screen-space margins, in CSS pixels of the renderer's surface, that the framed content must stay
 * clear of: an inspector drawn over the canvas, a floating header, a bottom sheet, a minimap.
 *
 * A host that draws its chrome *over* the canvas says where the chrome is; the renderer frames the
 * content in what is left. A host that gives the canvas its own space (a side panel beside it)
 * needs no insets at all.
 */
export type FitInsets = { top?: number; right?: number; bottom?: number; left?: number }

/** What a fit must honour beyond the content it frames. */
export type FitOptions = {
  /**
   * The smallest on-screen size of one world unit, in CSS pixels. A fit zooms in rather than shrink
   * the content below it: a view that cannot show everything legibly is panned, not shrunk to text
   * too small to read.
   */
  minScale?: number
  /**
   * The margin around the framed content, in the graph's own world units — the same units the
   * layout places cards in. Two renderers that frame the same content at the same scale give the
   * same margin, so the frame does not change when the host switches renderer.
   *
   * A renderer without its own default (the SpaceGraph core uses 100 world units) is free to keep
   * one; a host that wants both renderers to agree passes the padding explicitly.
   */
  padding?: number
  /** Screen-space margins the framed content must stay clear of, in CSS pixels. */
  insets?: FitInsets
}

export type RendererEventMap = {
  ready: void
  nodeClick: { id: string }
  edgeClick: { id: string }
  backgroundClick: void
  nodeDoubleClick: { id: string }
  /** Settled node positions after a drag. A group carries every descendant it moved. */
  nodeMoved: { nodes: readonly { id: string; position: [number, number, number] }[] }
  /** A DOM node's settled size after a resize gesture. */
  nodeResized: { id: string; size: [number, number]; position: [number, number, number] }
  hoverChange: { id?: string; kind?: 'node' | 'edge' }
  selectionChange: { ids: readonly string[] }
  viewportChange: RendererViewport
  bandChange: { band: string; zoom: number }
  error: { error: unknown }
}

export type Unsubscribe = () => void

export type GraphRenderer = {
  readonly capabilities: RendererCapabilities
  mount(container: HTMLElement, options: { theme: RenderTheme; projection: Projection }): Promise<void>
  setModel(model: RenderModel): void
  /** Apply an incremental patch to the current model. Optional: a renderer that does not support
   * incremental updates must no-op, never throw. */
  applyPatch?(patch: RenderModelPatch): void
  setTheme(theme: RenderTheme): void
  setProjection(projection: Projection): void
  /** Apply a depth treatment; a renderer that does not support the mode must no-op, never throw. */
  setDepth(depth: DepthMode): void
  setSelection(ids: readonly string[]): void
  setViewport(viewport: RendererViewport): void
  /**
   * The camera's current frame. A host that must place the camera exactly — a permalink, a
   * reduced-motion jump, a capture — reads it back instead of guessing. Optional: a renderer that
   * cannot report its camera leaves it undefined, and a host reads that as "no read-back", never as
   * a broken camera.
   */
  getViewport?(): RendererViewport
  /**
   * Where a node sits on the screen, in pixels from the canvas' top left. A host that anchors a
   * detail surface to a node reads it here instead of projecting the world itself. Optional: a
   * renderer that cannot place a node leaves it out, and a host reads that as "no anchor".
   */
  getNodeScreenPosition?(id: string): { x: number; y: number } | undefined
  /**
   * How the DOM cards face the camera. Optional: a renderer that draws no cards, or draws them in
   * screen space, leaves it out — and a host reads that as "not changeable", never as a broken
   * camera.
   */
  setCardFacing?(facing: CardFacing): void
  fit(ids?: readonly string[], options?: FitOptions): void
  focus(id: string): void
  resize(): void
  on<K extends keyof RendererEventMap>(event: K, handler: (payload: RendererEventMap[K]) => void): Unsubscribe
  dispose(): void
}

/** Capabilities a host can query before it offers an affordance. */
export type RendererCapability = Projection | 'domNodes' | 'edgeLabels' | 'clusterNodes' | 'minimap'

/** Single predicate for capability-gated UI (L1.28). Unknown capabilities are never assumed. */
export function supports(capabilities: RendererCapabilities, capability: RendererCapability): boolean {
  return capability === '2d' || capability === '3d'
    ? capabilities.projections.includes(capability)
    : capabilities[capability]
}

/** Whether a renderer can honour a depth treatment; hosts gate the depth chooser on this. */
export function supportsDepth(capabilities: RendererCapabilities, depth: DepthMode): boolean {
  return capabilities.depths.includes(depth)
}

// The theme bridge and the contrast auditor live beside the contract: they are pure, dependency-free,
// and every renderer and host needs them.
export * from './adapter';
export * from './clock';
export * from './color';
export * from './edge';
export * from './events';
export * from './theme';
