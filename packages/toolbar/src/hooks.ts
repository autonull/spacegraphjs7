/**
 * Toolbar hooks - Headless state management for toolbar.
 */

import { createSignal, createMemo } from "solid-js"
import type { Accessor, Setter } from "solid-js"
import type { ZoomLevel, DepthMode, Layout, GraphSide, GraphArrangement, DetailMode, DetailFraming, GraphFacets, GraphViewData } from "@spacegraphjs/shared/types"
import type { RendererCapabilities } from "@spacegraphjs/renderer"

export interface ToolbarState {
  level: Accessor<ZoomLevel>
  setLevel: Setter<ZoomLevel>
  facets: Accessor<GraphFacets>
  setFacets: Setter<GraphFacets>
  depth: Accessor<DepthMode>
  setDepth: Setter<DepthMode>
  layout: Accessor<Layout>
  setLayout: Setter<Layout>
  checkpoint: Accessor<number>
  setCheckpoint: Setter<number>
  zoomPercent: Accessor<number>
  setZoomPercent: Setter<number>
  files: Accessor<boolean>
  setFiles: Setter<boolean>
  arrangement: Accessor<GraphArrangement>
  setArrangement: Setter<GraphArrangement>
  arrangementSide: Accessor<GraphSide>
  setArrangementSide: Setter<GraphSide>
  detailMode: Accessor<DetailMode>
  setDetailMode: Setter<DetailMode>
  detailFraming: Accessor<DetailFraming>
  setDetailFraming: Setter<DetailFraming>
  peek: Accessor<boolean>
  setPeek: Setter<boolean>
  followLog: Accessor<boolean>
  setFollowLog: Setter<boolean>
  billboard: Accessor<boolean>
  setBillboard: Setter<boolean>
  legend: Accessor<boolean>
  setLegend: Setter<boolean>
  gallery: Accessor<boolean>
  setGallery: Setter<boolean>
}

export type ToolbarStateInitial = {
  level?: ZoomLevel
  facets?: GraphFacets
  depth?: DepthMode
  layout?: Layout
  checkpoint?: number
  zoomPercent?: number
  files?: boolean
  arrangement?: GraphArrangement
  arrangementSide?: GraphSide
  detailMode?: DetailMode
  detailFraming?: DetailFraming
  peek?: boolean
  followLog?: boolean
  billboard?: boolean
  legend?: boolean
  gallery?: boolean
}

/**
 * Hook for managing toolbar state.
 * Returns all toolbar state values and setters.
 */
export function useToolbarState(initial?: ToolbarStateInitial): ToolbarState {
  const [level, setLevel] = createSignal<ZoomLevel>(initial?.level ?? "execution")
  const [facets, setFacets] = createSignal<GraphFacets>(initial?.facets ?? { query: "", kinds: new Set(), statuses: new Set(), domains: new Set(["session"]) })
  const [depth, setDepth] = createSignal<DepthMode>(initial?.depth ?? "flat")
  const [layout, setLayout] = createSignal<Layout>(initial?.layout ?? "lanes")
  const [checkpoint, setCheckpoint] = createSignal<number>(initial?.checkpoint ?? 0)
  const [zoomPercent, setZoomPercent] = createSignal<number>(initial?.zoomPercent ?? 100)
  const [files, setFiles] = createSignal<boolean>(initial?.files ?? false)
  const [arrangement, setArrangement] = createSignal<GraphArrangement>(initial?.arrangement ?? "floating")
  const [arrangementSide, setArrangementSide] = createSignal<GraphSide>(initial?.arrangementSide ?? "start")
  const [detailMode, setDetailMode] = createSignal<DetailMode>(initial?.detailMode ?? "panel")
  const [detailFraming, setDetailFraming] = createSignal<DetailFraming>(initial?.detailFraming ?? "off")
  const [peek, setPeek] = createSignal<boolean>(initial?.peek ?? false)
  const [followLog, setFollowLog] = createSignal<boolean>(initial?.followLog ?? false)
  const [billboard, setBillboard] = createSignal<boolean>(initial?.billboard ?? false)
  const [legend, setLegend] = createSignal<boolean>(initial?.legend ?? false)
  const [gallery, setGallery] = createSignal<boolean>(initial?.gallery ?? false)

  return {
    level,
    setLevel,
    facets,
    setFacets,
    depth,
    setDepth,
    layout,
    setLayout,
    checkpoint,
    setCheckpoint,
    zoomPercent,
    setZoomPercent,
    files,
    setFiles,
    arrangement,
    setArrangement,
    arrangementSide,
    setArrangementSide,
    detailMode,
    setDetailMode,
    detailFraming,
    setDetailFraming,
    peek,
    setPeek,
    followLog,
    setFollowLog,
    billboard,
    setBillboard,
    legend,
    setLegend,
    gallery,
    setGallery,
  }
}

/**
 * Hook for deriving toolbar props from state.
 * Useful for connecting toolbar state to the GraphToolbar component.
 */
export function useToolbarProps(
  state: ToolbarState,
  overrides: {
    capabilities?: RendererCapabilities
    renderer?: string
    turnCount?: number
    model?: GraphViewData
    facetCounts?: { kinds: any[]; statuses: any[]; domains: any[] }
    onFit: () => void
    onSearch: () => void
    onExport?: (format: "svg" | "json" | "html", model: any) => void
    renderModel?: any
    i18n: any
  },
) {
  return createMemo(() => ({
    capabilities: overrides.capabilities,
    renderer: overrides.renderer,
    level: state.level(),
    onLevel: state.setLevel,
    facets: state.facets(),
    facetCounts: overrides.facetCounts,
    onFacetsChange: state.setFacets,
    depth: state.depth(),
    onDepth: state.setDepth,
    checkpoint: state.checkpoint(),
    turnCount: overrides.turnCount,
    onCheckpoint: state.setCheckpoint,
    onFit: overrides.onFit,
    zoomPercent: state.zoomPercent(),
    onZoomOut: () => state.setZoomPercent((p) => Math.max(25, p - 25)),
    onZoomIn: () => state.setZoomPercent((p) => Math.min(400, p + 25)),
    onSearch: overrides.onSearch,
    onCopyView: undefined,
    dispatchCommand: undefined,
    layout: state.layout(),
    onLayoutChange: state.setLayout,
    files: state.files(),
    onToggleFiles: () => state.setFiles((f) => !f),
    arrangement: state.arrangement(),
    onArrangementChange: state.setArrangement,
    arrangementSide: state.arrangementSide(),
    onArrangementSideChange: state.setArrangementSide,
    onOpenEqualizer: undefined,
    detailMode: state.detailMode(),
    onDetailModeChange: state.setDetailMode,
    detailFraming: state.detailFraming(),
    onDetailFramingChange: state.setDetailFraming,
    peek: state.peek(),
    onTogglePeek: () => state.setPeek((p) => !p),
    followLog: state.followLog(),
    onFollowLogChange: state.setFollowLog,
    onOpenWindow: undefined,
    model: overrides.model,
    legend: state.legend(),
    onToggleLegend: () => state.setLegend((l) => !l),
    gallery: state.gallery(),
    onToggleGallery: () => state.setGallery((g) => !g),
    onTurnMap: undefined,
    onExpandGraph: undefined,
    onExport: overrides.onExport,
    renderModel: overrides.renderModel,
    onBack: undefined,
    onSplitView: undefined,
    searching: false,
    compact: false,
    billboard: state.billboard(),
    onToggleBillboard: () => state.setBillboard((b) => !b),
    endInset: undefined,
    i18n: overrides.i18n,
  }))
}