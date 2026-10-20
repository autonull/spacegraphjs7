/**
 * `@spacegraphjs/renderer` — the renderer contract.
 *
 * Types and tiny helpers only. Zero runtime dependencies, no `three`, no `cytoscape`, no core import.
 * A host builds a `RenderModel`, a renderer adapter renders it, and the two never share library objects.
 */

export const CONTRACT_VERSION = 2

/** Versions this contract package implements; adapters declare theirs via `capabilities.contractVersion`. */
export const SUPPORTED_CONTRACT_VERSIONS: readonly number[] = [CONTRACT_VERSION]

export function supportsContractVersion(version: number): boolean {
  return SUPPORTED_CONTRACT_VERSIONS.includes(version)
}

export type ContractNegotiation = { ok: true } | { ok: false; message: string }

/** P8.7: a host checks this before rendering so a mismatched adapter fails with a clear message. */
export function negotiateContract(version: number): ContractNegotiation {
  return supportsContractVersion(version)
    ? { ok: true }
    : {
        ok: false,
        message: `Renderer contract version ${version} is not supported (this host implements ${CONTRACT_VERSION}).`,
      }
}

export type Projection = '2d' | '3d'

/**
 * LE.14 — depth is a spectrum, not a 2D/3D toggle. `flat` is the orthographic baseline; `layered` and
 * `depth-stack` add depth ordering under a shallow camera; `orbit` is the free-perspective experiment.
 */
export type DepthMode = 'flat' | 'layered' | 'depth-stack' | 'orbit'

/** Canonical depth order, shallowest first; hosts render choosers in this order. */
export const DEPTH_MODES: readonly DepthMode[] = ['flat', 'layered', 'depth-stack', 'orbit']

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
  shape?: 'card' | 'panel' | 'dot' | 'badge'
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
  contractVersion: number
  projections: readonly Projection[]
  /** Depth treatments this renderer can honour, in `DepthMode` terms. */
  depths: readonly DepthMode[]
  domNodes: boolean
  maxDomNodes: number
  edgeLabels: boolean
  clusterNodes: boolean
  minimap: boolean
  maxRecommendedNodes: number
}

export type RendererViewport = {
  zoom: number
  center: [number, number, number]
  /** Visible world extent in the graph's XY plane, when the renderer can report it (host minimaps). */
  extent?: { width: number; height: number }
  band?: string
}

/** What a fit must honour beyond the content it frames. */
export type FitOptions = {
  /**
   * The smallest on-screen size of one world unit, in CSS pixels. A fit zooms in rather than shrink
   * the content below it: a view that cannot show everything legibly is panned, not shrunk to text
   * too small to read.
   */
  minScale?: number
}

export type RendererEventMap = {
  ready: void
  nodeClick: { id: string }
  edgeClick: { id: string }
  backgroundClick: void
  nodeDoubleClick: { id: string }
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
  setTheme(theme: RenderTheme): void
  setProjection(projection: Projection): void
  /** Apply a depth treatment; a renderer that does not support the mode must no-op, never throw. */
  setDepth(depth: DepthMode): void
  setSelection(ids: readonly string[]): void
  setViewport(viewport: RendererViewport): void
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
export * from './theme';
