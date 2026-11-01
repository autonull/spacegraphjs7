import type {
  RenderTheme,
  Projection,
  RenderModel,
  RendererCapabilities,
  DetailMode,
  EqualizerRuleSet,
  GraphViewData,
  GraphNode,
  GraphEdge,
  Layout,
  UseGraphAnnotationsReturn,
  UseGraphSelectionReturn,
  UseGraphCameraReturn,
  UseGroupCollapseReturn,
  UseEdgeKindsReturn,
  GraphDiffSource,
} from "@spacegraphjs/shared"
import { createIconRenderer, type IconComponent } from "@spacegraphjs/shared/icons"
import type { I18n } from "@spacegraphjs/shared/i18n"
import { Show, type JSX } from "solid-js"
import { createEffect } from "solid-js"
import { useSpring, springPresets } from "@spacegraphjs/shared"
import { GraphPeek } from "./GraphPeek"
import { GraphPopover } from "./GraphPopover"

export type GraphOverlayManagerProps = {
  // Model & theme
  model: () => GraphViewData
  theme: RenderTheme
  projection: Projection
  depth: "flat" | "layered" | "depth-stack" | "orbit"
  detailMode: DetailMode
  effectiveDetailMode: DetailMode
  layout: Layout

  // Selection & navigation
  selection: () => readonly string[]
  select: (id: string | undefined, add?: boolean) => void
  graphSelection: UseGraphSelectionReturn

  // Peek
  peekFrame: { node: GraphNode; left: number; top: number } | undefined
  peekEdge: GraphEdge | undefined

  // Popover
  popoverVisible: GraphNode | undefined
  popoverNode: GraphNode | undefined
  popoverPlacement: { left: number; top: number }
  setPopoverDismissed: (dismissed: boolean) => void

  // Annotations (notes + trace)
  annotations: UseGraphAnnotationsReturn
  noteTargetNode: () => GraphNode | undefined
  noteAnchor: { x: number; y: number } | undefined

  // Search
  searchOpen: () => boolean
  searchInitial: string
  setSearchOpen: (open: boolean) => void
  jumpTo: (node: GraphNode) => void

  // Legend
  legendOpen: () => boolean
  setLegendOpen: (open: boolean) => void
  edgeKinds: UseEdgeKindsReturn
  rules: EqualizerRuleSet | undefined

  // Gallery
  galleryOpen: () => boolean
  setGalleryOpen: (open: boolean) => void
  changeLayout: (next: Layout) => void

  // Group menu
  groupMenu: () => { id: string; x: number; y: number } | undefined
  setGroupMenu: (menu: { id: string; x: number; y: number } | undefined) => void
  groupCollapse: UseGroupCollapseReturn
  camera: UseGraphCameraReturn
  toggleGroupByID: (id: string) => void
  modelForGroupMenu: () => GraphViewData

  // Error/Empty states
  error: string | undefined
  onBack: (() => void) | undefined

  // Diff
  diffSource: GraphDiffSource | undefined
  link: string | undefined
  onOpenTranscript: ((id: string) => void) | undefined
  onOpenSession: ((sessionID: string) => void) | undefined
  onOpenWindow: ((kind: string, nodeID?: string) => void) | undefined
  onCopyView: () => void
  renderSummary: ((node: GraphNode) => JSX.Element | undefined) | undefined

  // A11y
  ordered: RenderModel
  viewAnnouncement: string
  a11yInstructionsId: string
  announce: (message: string) => void
  i18n: I18n

  // Optional host-provided components (render props for OpenCode-specific components)
  renderA11y?: (props: {
    model: RenderModel
    selection: readonly string[]
    instructionsId: string
    announcement: string
    onSelect: (id: string | undefined, add?: boolean) => void
    onEscape: () => void
    i18n: I18n
    Icon?: IconComponent
  }) => JSX.Element
  renderNoteComposer?: (props: {
    targetLabel: string
    initialValue: string | undefined
    anchor: { x: number; y: number } | undefined
    onSave: (body: string) => void
    onClose: () => void
    i18n: I18n
    Icon?: IconComponent
  }) => JSX.Element
  renderSearch?: (props: {
    model: GraphViewData
    initialQuery: string
    onSelect: (node: GraphNode) => void
    onClose: () => void
    i18n: I18n
    Icon?: IconComponent
  }) => JSX.Element
  renderLegend?: (props: {
    theme: RenderTheme
    layout: Layout
    rules: EqualizerRuleSet | undefined
    edgeKinds: readonly { kind: string; label: string; color: string; visible: boolean }[]
    onToggleEdgeKind: (kind: string) => void
    onClose: () => void
    i18n: I18n
    Icon?: IconComponent
  }) => JSX.Element
  renderGallery?: (props: {
    model: GraphViewData
    theme: RenderTheme
    current: Layout
    onOpen: (layout: Layout) => void
    onClose: () => void
    i18n: I18n
    Icon?: IconComponent
  }) => JSX.Element
  renderGroupMenu?: (props: {
    id: string
    x: number
    y: number
    model: () => GraphViewData
    collapsedGroups: ReadonlySet<string>
    onToggleGroup: (id: string) => void
    onCollapseOthers: (groupId: string) => void
    onFrame: (id: string) => void
    onClose: () => void
    i18n: I18n
    Icon?: IconComponent
  }) => JSX.Element
  renderError?: (props: { error: string | undefined; onBack: (() => void) | undefined; i18n: I18n; Icon?: IconComponent }) => JSX.Element
  renderEmpty?: (props: { model: () => GraphViewData; error: string | undefined; i18n: I18n; Icon?: IconComponent }) => JSX.Element

  // Optional host-provided Icon component
  Icon?: IconComponent
}

/**
 * The overlay manager for the graph canvas — all floating overlays that live
 * on or above the canvas (peek, popover, note composer, search, legend, gallery, group menu, A11y, error/empty states).
 * 
 * This component is generic and accepts render props for host-specific components.
 * The host (e.g., @opencode/session-graph) provides the render props for components
 * that use OpenCode-specific UI components.
 */
export const GraphOverlayManager = (props: GraphOverlayManagerProps): JSX.Element => {
  const { i18n, Icon, ...rest } = props

  const defaultRenderA11y = (p: Parameters<NonNullable<typeof props.renderA11y>>[0]) => (
    <div data-slot="graph-a11y-placeholder" />
  )

  const defaultRenderNoteComposer = (p: Parameters<NonNullable<typeof props.renderNoteComposer>>[0]) => (
    <div data-slot="graph-note-composer-placeholder" />
  )

  const defaultRenderSearch = (p: Parameters<NonNullable<typeof props.renderSearch>>[0]) => (
    <div data-slot="graph-search-placeholder" />
  )

  const defaultRenderLegend = (p: Parameters<NonNullable<typeof props.renderLegend>>[0]) => (
    <div data-slot="graph-legend-placeholder" />
  )

  const defaultRenderGallery = (p: Parameters<NonNullable<typeof props.renderGallery>>[0]) => (
    <div data-slot="graph-gallery-placeholder" />
  )

  const defaultRenderGroupMenu = (p: Parameters<NonNullable<typeof props.renderGroupMenu>>[0]) => (
    <div data-slot="graph-group-menu-placeholder" />
  )

  const defaultRenderError = (p: Parameters<NonNullable<typeof props.renderError>>[0]) => (
    <div data-slot="graph-error-placeholder" />
  )

  const defaultRenderEmpty = (p: Parameters<NonNullable<typeof props.renderEmpty>>[0]) => (
    <div data-slot="graph-empty-placeholder" />
  )

  // Spring animations for smooth peek positioning
  const [peekLeft, setPeekLeft] = useSpring(0, springPresets.smooth)
  const [peekTop, setPeekTop] = useSpring(0, springPresets.smooth)
  createEffect(() => {
    const frame = props.peekFrame
    if (frame) {
      setPeekLeft(frame.left)
      setPeekTop(frame.top)
    }
  })

  return (
    <>
      <Show when={props.renderA11y}>
        {props.renderA11y!({
          model: props.ordered,
          selection: props.selection(),
          instructionsId: props.a11yInstructionsId,
          announcement: props.viewAnnouncement,
          onSelect: props.select,
          onEscape: () => props.select(undefined),
          i18n,
          Icon,
        })}
      </Show>
      <Show when={!props.renderA11y}>
        {defaultRenderA11y({
          model: props.ordered,
          selection: props.selection(),
          instructionsId: props.a11yInstructionsId,
          announcement: props.viewAnnouncement,
          onSelect: props.select,
          onEscape: () => props.select(undefined),
          i18n,
          Icon,
        })}
      </Show>

      <Show when={props.peekFrame}>
        {(frame) => (
          <div
            data-slot="graph-peek-anchor"
            class="absolute z-20 -translate-x-1/2"
            style={{ left: `${peekLeft()}px`, top: `${peekTop()}px` }}
          >
            <GraphPeek node={frame().node} i18n={i18n} Icon={Icon} />
          </div>
        )}
      </Show>
      <Show when={props.peekEdge}>
        {(edge) => (
          <div data-slot="graph-edge-peek-anchor" class="absolute bottom-2 left-2 z-20">
            <GraphPeek edge={edge()} i18n={i18n} Icon={Icon} />
          </div>
        )}
      </Show>

      <Show when={props.annotations.noteTarget()}>
        <Show when={props.renderNoteComposer}>
          {props.renderNoteComposer!({
            targetLabel: props.noteTargetNode()?.label ?? props.annotations.noteTarget() ?? "",
            initialValue:
              props.annotations.editingNote()
                ? (props.annotations.notes as unknown as Record<string, { body: string }>)[
                    props.annotations.editingNote()!
                  ]?.body
                : undefined,
            anchor: props.noteAnchor,
            onSave: props.annotations.saveNote,
            onClose: props.annotations.closeNoteComposer,
            i18n,
            Icon,
          })}
        </Show>
        <Show when={!props.renderNoteComposer}>
          {defaultRenderNoteComposer({
            targetLabel: props.noteTargetNode()?.label ?? props.annotations.noteTarget() ?? "",
            initialValue:
              props.annotations.editingNote()
                ? (props.annotations.notes as unknown as Record<string, { body: string }>)[
                    props.annotations.editingNote()!
                  ]?.body
                : undefined,
            anchor: props.noteAnchor,
            onSave: props.annotations.saveNote,
            onClose: props.annotations.closeNoteComposer,
            i18n,
            Icon,
          })}
        </Show>
      </Show>

      <Show when={props.effectiveDetailMode === "popover"}>
        <div
          data-slot="graph-popover-anchor"
          class="absolute z-20"
          style={{
            left: `${props.popoverPlacement.left}px`,
            top: `${props.popoverPlacement.top}px`,
            display: props.popoverVisible ? "block" : "none",
          }}
        >
          <GraphPopover
            i18n={i18n}
            Icon={Icon}
            model={props.model()}
            node={props.popoverNode}
            diffSource={props.diffSource}
            renderSummary={props.renderSummary}
            link={props.link}
            onCopyView={props.onCopyView}
            onSelect={props.select}
            onOpenTranscript={props.onOpenTranscript}
            onOpenSession={props.onOpenSession}
            onOpenWindow={props.onOpenWindow ? (nodeID?: string) => props.onOpenWindow!("node", nodeID) : undefined}
            onClose={() => props.setPopoverDismissed(true)}
            traceKind={props.annotations.traceKind()}
            onTraceWhy={props.annotations.traceWhy}
            onTraceLedHere={props.annotations.traceLedHere}
            onTraceRelated={props.annotations.traceRelated}
            onClearTrace={props.annotations.clearTrace}
            onCopyTraceOutline={props.annotations.copyTraceOutline}
            onEditNote={props.annotations.editNote}
            onDeleteNote={props.annotations.deleteNote}
            onCopyNote={props.annotations.copyNote}
          />
        </div>
      </Show>

      <Show when={props.renderError}>
        {props.renderError!({
          error: props.error,
          onBack: props.onBack,
          i18n,
          Icon,
        })}
      </Show>
      <Show when={!props.renderError}>
        {defaultRenderError({ error: props.error, onBack: props.onBack, i18n, Icon })}
      </Show>

      <Show when={props.renderEmpty}>
        {props.renderEmpty!({
          model: props.model,
          error: props.error,
          i18n,
          Icon,
        })}
      </Show>
      <Show when={!props.renderEmpty}>
        {defaultRenderEmpty({ model: props.model, error: props.error, i18n, Icon })}
      </Show>

      <Show when={props.searchOpen()}>
        <Show when={props.renderSearch}>
          {props.renderSearch!({
            model: props.model(),
            initialQuery: props.searchInitial,
            onSelect: (node) => {
              props.jumpTo(node)
              props.setSearchOpen(false)
            },
            onClose: () => props.setSearchOpen(false),
            i18n,
            Icon,
          })}
        </Show>
        <Show when={!props.renderSearch}>
          {defaultRenderSearch({
            model: props.model(),
            initialQuery: props.searchInitial,
            onSelect: (node) => {
              props.jumpTo(node)
              props.setSearchOpen(false)
            },
            onClose: () => props.setSearchOpen(false),
            i18n,
            Icon,
          })}
        </Show>
      </Show>

      <Show when={props.legendOpen()}>
        <Show when={props.renderLegend}>
          {props.renderLegend!({
            theme: props.theme,
            layout: props.layout,
            rules: props.rules,
            edgeKinds: props.edgeKinds.edgeKinds(),
            onToggleEdgeKind: props.edgeKinds.toggleEdgeKind,
            onClose: () => props.setLegendOpen(false),
            i18n,
            Icon,
          })}
        </Show>
        <Show when={!props.renderLegend}>
          {defaultRenderLegend({
            theme: props.theme,
            layout: props.layout,
            rules: props.rules,
            edgeKinds: props.edgeKinds.edgeKinds(),
            onToggleEdgeKind: props.edgeKinds.toggleEdgeKind,
            onClose: () => props.setLegendOpen(false),
            i18n,
            Icon,
          })}
        </Show>
      </Show>

      <Show when={props.galleryOpen()}>
        <Show when={props.renderGallery}>
          {props.renderGallery!({
            model: props.model(),
            theme: props.theme,
            current: props.layout,
            onOpen: props.changeLayout,
            onClose: () => props.setGalleryOpen(false),
            i18n,
            Icon,
          })}
        </Show>
        <Show when={!props.renderGallery}>
          {defaultRenderGallery({
            model: props.model(),
            theme: props.theme,
            current: props.layout,
            onOpen: props.changeLayout,
            onClose: () => props.setGalleryOpen(false),
            i18n,
            Icon,
          })}
        </Show>
      </Show>

      <Show when={props.groupMenu()}>
        {(menu) => (
          <>
            <Show when={props.renderGroupMenu}>
              {props.renderGroupMenu!({
                id: menu().id,
                x: menu().x,
                y: menu().y,
                model: props.modelForGroupMenu,
                collapsedGroups: props.groupCollapse.collapsedGroups(),
                onToggleGroup: props.toggleGroupByID,
                onCollapseOthers: props.groupCollapse.collapseOtherGroups,
                onFrame: (id) => props.camera.frame([id]),
                onClose: () => props.setGroupMenu(undefined),
                i18n,
                Icon,
              })}
            </Show>
            <Show when={!props.renderGroupMenu}>
              {defaultRenderGroupMenu({
                id: menu().id,
                x: menu().x,
                y: menu().y,
                model: props.modelForGroupMenu,
                collapsedGroups: props.groupCollapse.collapsedGroups(),
                onToggleGroup: props.toggleGroupByID,
                onCollapseOthers: props.groupCollapse.collapseOtherGroups,
                onFrame: (id) => props.camera.frame([id]),
                onClose: () => props.setGroupMenu(undefined),
                i18n,
                Icon,
              })}
            </Show>
          </>
        )}
      </Show>
    </>
  )
}