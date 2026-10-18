/**
 * `@spacegraphjs/renderer` — the renderer contract.
 *
 * Types and tiny helpers only. Zero runtime dependencies, no `three`, no `cytoscape`, no core import.
 * A host builds a `RenderModel`, a renderer adapter renders it, and the two never share library objects.
 */

export const CONTRACT_VERSION = 1

export type Projection = '2d' | '3d'

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
  setSelection(ids: readonly string[]): void
  setViewport(viewport: RendererViewport): void
  fit(ids?: readonly string[]): void
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
