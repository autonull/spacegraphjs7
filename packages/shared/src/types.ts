/**
 * Generic graph types for SpaceGraphJS.
 * These are framework-agnostic types that can be used by any host.
 */

import type { RenderTheme, RendererCapabilities, Projection, RenderModel, RendererViewport } from "@spacegraphjs/renderer"

/** 2D position coordinate. */
export interface Position {
  x: number
  y: number
}

/** Graph node - generic version of session-ui GraphNode. */
export interface GraphNode {
  id: string
  label: string
  kind: string
  status: string
  summary?: string
  provenance?: {
    source: string
    asOf?: number
  }
  data?: Record<string, unknown>
  interactive?: boolean
}

/** Graph edge - generic version of session-ui GraphEdge. */
export interface GraphEdge {
  id: string
  source: string
  target: string
  kind: string
  confidence?: "explicit" | "structural" | "inferred"
  label?: string
  data?: Record<string, unknown>
}

/** Graph view data - generic version of session-ui GraphViewData. */
export interface GraphViewData {
  nodes: readonly GraphNode[]
  edges: readonly GraphEdge[]
  turns?: readonly string[]
  workspaceRoot?: string
}

/** Graph facets for filtering. */
export interface GraphFacets {
  query: string
  kinds: ReadonlySet<string>
  statuses: ReadonlySet<string>
  domains: ReadonlySet<string>
}

/** Facet counts for display. */
export interface FacetCounts {
  kinds: readonly { value: string; kept: number; total: number }[]
  statuses: readonly { value: string; kept: number; total: number }[]
  domains: readonly { value: string; kept: number; total: number }[]
}

/** Zoom/semantic level. */
export type ZoomLevel = "overview" | "execution" | "detail"

/** Depth/projection mode. */
export type DepthMode = "flat" | "layered" | "depth-stack" | "orbit"

/** Layout type. */
export type Layout = "lanes" | "timeline" | "radial" | "force"

/** Graph side for split views. */
export type GraphSide = "start" | "end"

/** Graph arrangement for hybrid views. */
export type GraphArrangement = "floating" | "split" | "full"

/** Detail mode for node detail display. */
export type DetailMode = "panel" | "popover" | "inline"

/** Detail framing behavior. */
export type DetailFraming = "off" | "card"

/** Profile presets for facet combinations. */
export interface ProfilePreset {
  id: string
  labelKey: string
  domains: readonly string[]
  statuses?: readonly string[]
}

/** Vocabulary keys for i18n. */
export interface VocabularyKeys {
  level: Record<ZoomLevel, string>
  depth: Record<DepthMode, string>
  layout: Record<Layout, string>
  side: Record<GraphSide, string>
  arrangement: Record<GraphArrangement, string>
  kind: Record<string, string>
  status: Record<string, string>
  domain: Record<string, string>
  confidence: Record<string, string>
  edge: Record<string, string>
  lane: Record<string, string>
  detailMode: Record<DetailMode, string>
  phase: Record<string, string>
}

/** Default vocabulary keys for i18n. */
export const VOCABULARY_KEYS: VocabularyKeys = {
  level: {
    overview: "ui.toolbar.level.overview",
    execution: "ui.toolbar.level.execution",
    detail: "ui.toolbar.level.detail",
  },
  depth: {
    flat: "ui.toolbar.depth.flat",
    layered: "ui.toolbar.depth.layered",
    "depth-stack": "ui.toolbar.depth.depthStack",
    orbit: "ui.toolbar.depth.orbit",
  },
  layout: {
    lanes: "ui.toolbar.layout.lanes",
    timeline: "ui.toolbar.layout.timeline",
    radial: "ui.toolbar.layout.radial",
    force: "ui.toolbar.layout.force",
  },
  side: {
    start: "ui.toolbar.side.start",
    end: "ui.toolbar.side.end",
  },
  arrangement: {
    floating: "ui.toolbar.arrangement.floating",
    split: "ui.toolbar.arrangement.split",
    full: "ui.toolbar.arrangement.full",
  },
  kind: {},
  status: {},
  domain: {},
  confidence: {
    explicit: "ui.toolbar.confidence.explicit",
    structural: "ui.toolbar.confidence.structural",
    inferred: "ui.toolbar.confidence.inferred",
  },
  edge: {},
  lane: {},
  detailMode: {
    panel: "ui.toolbar.detailMode.panel",
    popover: "ui.toolbar.detailMode.popover",
    inline: "ui.toolbar.detailMode.inline",
  },
  phase: {},
}

/** Constants for toolbar components. */
export const ZOOM_LEVELS: readonly ZoomLevel[] = ["overview", "execution", "detail"] as const
export const DEPTH_MODES: readonly DepthMode[] = ["flat", "layered", "depth-stack", "orbit"] as const
export const LAYOUTS: readonly Layout[] = ["lanes", "timeline", "radial", "force"] as const
export const GRAPH_ARRANGEMENTS: readonly GraphArrangement[] = ["floating", "split", "full"] as const
export const DETAIL_MODES: readonly DetailMode[] = ["panel", "popover", "inline"] as const

export const DOMAINS: readonly string[] = ["session", "filesystem", "code", "terminal", "browser"] as const
export const NODE_KINDS: readonly string[] = ["turn", "phase", "tool", "file", "error", "note", "group"] as const
export const NODE_STATUSES: readonly string[] = ["pending", "running", "completed", "failed", "cancelled"] as const

export const PROFILE_PRESETS: readonly {
  id: string
  labelKey: string
  domains: readonly string[]
  statuses?: readonly string[]
}[] = [
  { id: "all", labelKey: "ui.toolbar.profile.all", domains: ["session", "filesystem", "code", "terminal", "browser"] },
  { id: "code", labelKey: "ui.toolbar.profile.code", domains: ["code"] },
  { id: "files", labelKey: "ui.toolbar.profile.files", domains: ["filesystem"] },
] as const

/** Toolbar-specific types. */
export interface ToolbarLevelOption {
  value: ZoomLevel
  label: string
}

export interface ToolbarDepthOption {
  value: DepthMode
  label: string
  disabled?: boolean
  title?: string
}

export interface ToolbarLayoutOption {
  value: Layout
  label: string
}

/** Search types. */
export interface SearchResult {
  node: GraphNode
  score: number
}

/** Navigation types (from spacegraphjs/navigation). */
export interface NavigationProjection {
  project: (point: { x: number; y: number }) => { x: number; y: number }
  unproject: (point: { x: number; y: number }) => { x: number; y: number }
  viewRect?: { x: number; y: number; width: number; height: number }
}

/** Export types. */
export type ExportFormat = "svg" | "json" | "html"

export interface ExportOptions {
  theme: RenderTheme
  sessionTitle?: string
  testedCommit?: string
  timestamp?: string
}

/** Diff types. */
export interface CodeDiff {
  file: string
  additions: number
  deletions: number
  patch: string
}

export interface CodeDiffSource {
  load: (from: string) => void
  get: (from: string) => readonly CodeDiff[] | undefined
}

/** Compare types. */
export interface CompareChanges {
  added: ReadonlySet<string>
  removed: ReadonlySet<string>
  changed: ReadonlySet<string>
  turnStats?: readonly TurnStats[]
}

export interface TurnStats {
  turnNumber: number
  filesTouched: number
  toolsRun: number
  errors: number
  retries: number
  durationMs: number
}

/** Legend types. */
export interface EqualizerRuleSet {
  [key: string]: unknown
}

export interface GraphSnapshotMeta {
  asOf?: Record<string, number>
  missing?: readonly { source: string; reason: string }[]
}

/** Overlay types. */
export interface ScopedOverlayOptions {
  container: HTMLElement
  onClose: () => void
  useCapture?: boolean
}

/** A11y types. */
export interface AccessibleItem {
  id: string
  label: string
  kind: string
  status: string
  interactive: boolean
}

export interface AccessibleEdge {
  id: string
  source: string
  target: string
  kind: string
  label: string
}

/** Inline graph types. */
export interface InlineGraphOptions {
  theme?: Partial<RenderTheme>
  width?: number
  height?: number
}

/**
 * Checks if a renderer supports a given depth mode.
 */
export function supportsDepth(capabilities: RendererCapabilities | undefined, depth: DepthMode): boolean {
  if (!capabilities) return true
  return capabilities.depths?.includes(depth) ?? true
}

/** Re-export renderer types for convenience. */
export type {
  RenderTheme,
  RendererCapabilities,
  Projection,
  RenderModel,
  RendererViewport,
}