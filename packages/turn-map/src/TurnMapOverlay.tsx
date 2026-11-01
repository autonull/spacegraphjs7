import type { RenderTheme } from "@spacegraphjs/renderer"
import type { I18n } from "@spacegraphjs/shared/i18n"
import type { GraphViewData, GraphNode, RendererID, RendererFactory, CardTemplate } from "@spacegraphjs/shared"
import { createIconRenderer, type IconComponent } from "@spacegraphjs/shared"
import { createMemo, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js"
import { ScopedOverlay } from "@spacegraphjs/overlays"
import { nodeByID } from "@spacegraphjs/shared"
import { buildTurnRenderModel } from "./turnMap"

export type TurnMapOverlayProps = {
  /** The i18n instance for translations. */
  i18n: I18n
  /** The icon component to use. */
  Icon?: IconComponent
  /** The graph model. */
  model: GraphViewData
  /** The turn to summarize; the overlay is empty when it is not in the model. */
  turnID: string
  /** Defaults to the live host theme read from CSS tokens. */
  theme?: RenderTheme
  /** Maximum nodes shown, including the turn itself. */
  limit?: number
  /** Preferred renderer ID. */
  preferredRenderer?: () => RendererID
  /** Renderer overrides. */
  rendererOverrides?: Partial<Record<RendererID, RendererFactory>>
  /** Card template for rendering. */
  renderCard?: CardTemplate
  /** Callback when a node is selected. */
  onSelect?: (id: string | undefined) => void
  /** Callback to open the full graph for this turn. */
  onOpenFullGraph?: (turnID: string) => void
  /** Callback when the overlay should close. */
  onClose: () => void
  /** When true, all camera animations complete instantly without easing. */
  reducedMotion?: boolean

  // Render props for host-specific components
  /** Render prop for the graph canvas. */
  renderCanvas?: (props: {
    model: unknown
    theme: RenderTheme
    selection: readonly string[]
    preferredRenderer?: () => RendererID
    overrides?: Partial<Record<RendererID, RendererFactory>>
    onSelect: (ids: readonly string[]) => void
    onBackgroundClick: () => void
    reducedMotion?: boolean
  }) => JSX.Element
  /** Render prop for the inspector panel. */
  renderInspector?: (props: {
    model: GraphViewData
    node: unknown
    onSelect: (id: string | undefined) => void
    i18n: I18n
    Icon?: IconComponent
  }) => JSX.Element
  /** Function to create the graph theme. */
  createTheme?: () => RenderTheme
  /** Function to get node by ID. */
  nodeByID?: (model: GraphViewData, id: string) => GraphNode | undefined
}

/**
 * The hybrid turn map: a compact, execution-level subgraph of one turn opened over the
 * transcript so the reader keeps their place. It shows the same detail panel as the full graph,
 * traps focus, closes on Escape, and restores focus to the control that opened it. It is sized by
 * the host container, which must be `position: relative`.
 * 
 * The scope and the focus behaviour live in the library (`@spacegraphjs/overlays`); this component is
 * the session's vocabulary and its slots.
 */
export const TurnMapOverlay = (props: TurnMapOverlayProps): JSX.Element => {
  const { i18n, Icon, model, turnID, theme, limit, preferredRenderer, rendererOverrides, renderCard, onSelect, onOpenFullGraph, onClose, reducedMotion, renderCanvas, renderInspector, createTheme, nodeByID: customNodeByID } = props

  const resolvedTheme = createTheme ?? createGraphTheme
  const [selection, setSelection] = createSignal<readonly string[]>([])
  let dialog!: HTMLDivElement
  let overlay: ScopedOverlay | undefined

  const themeValue = () => theme ?? resolvedTheme()
  const getNodeByID = customNodeByID ?? nodeByID
  const turn = createMemo(() => getNodeByID(model, turnID))
  const renderModel = createMemo(() =>
    buildTurnRenderModel(model, turnID, { limit: limit ?? 7, renderCard }),
  )
  const selectedNode = () => {
    const id = selection()[0]
    return id ? getNodeByID(model, id) : undefined
  }
  const select = (id: string | undefined) => {
    setSelection(id ? [id] : [])
    onSelect?.(id)
  }

  onMount(() => {
    // Use capture phase to ensure focus trap works correctly when nested inside another dialog
    overlay = new ScopedOverlay({ container: dialog, onClose: () => onClose(), useCapture: true })
  })
  onCleanup(() => {
    overlay?.dispose()
    overlay = undefined
  })

  return (
    <div class="absolute inset-0 z-40 flex items-center justify-center p-4" data-component="spacegraph-turn-map">
      <div class="absolute inset-0 bg-background-base/60" aria-hidden="true" onClick={() => onClose()} />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={i18n.t("ui.sessionGraph.turnMap.label")}
        tabindex="-1"
        data-slot="graph-turn-map"
        class="relative flex h-[min(520px,100%)] w-[min(760px,100%)] flex-col overflow-hidden rounded-md border border-border-base bg-background-base shadow-lg"
      >
        <div class="flex items-center gap-2 border-b border-border-weaker-base px-3 py-1.5">
          <span class="text-13-medium text-text-strong" style={{ "line-height": "var(--line-height-compact)" }}>
            {i18n.t("ui.sessionGraph.turnMap.title")}
          </span>
          <span class="min-w-0 flex-1 truncate text-12-regular text-text-weak">{turn()?.label ?? ""}</span>
          <GraphIconButton
            label={i18n.t("ui.sessionGraph.turnMap.close")}
            icon="close"
            onClick={() => onClose()}
            Icon={Icon}
          />
        </div>
        <div class="relative flex min-h-0 flex-1">
          <div class="relative min-w-0 flex-1" data-slot="graph-turn-map-canvas">
            <Show when={renderCanvas}>
              {renderCanvas!({
                model: renderModel(),
                theme: themeValue(),
                selection: selection(),
                preferredRenderer,
                overrides: rendererOverrides,
                onSelect: (ids) => select(ids[0]),
                onBackgroundClick: () => select(undefined),
                reducedMotion,
              })}
            </Show>
            <Show when={!renderCanvas}>
              <div data-slot="graph-canvas-placeholder" class="flex-1" />
            </Show>
          </div>
          <div class="w-64 max-w-[45%] shrink-0">
            <Show when={renderInspector}>
              {renderInspector!({
                model,
                node: selectedNode(),
                onSelect: select,
                i18n,
                Icon,
              })}
            </Show>
            <Show when={!renderInspector}>
              <div data-slot="graph-inspector-placeholder" class="w-64 max-w-[45%] shrink-0" />
            </Show>
          </div>
        </div>
        <Show when={onOpenFullGraph}>
          <div class="flex items-center justify-end border-t border-border-weaker-base px-3 py-1.5">
            <button
              type="button"
              class="rounded-sm border border-border-base px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
              onClick={() => onOpenFullGraph?.(turnID)}
            >
              {i18n.t("ui.sessionGraph.turnMap.openFull")}
            </button>
          </div>
        </Show>
      </div>
    </div>
  )
}

// Default theme creator - host should override
function createGraphTheme(): RenderTheme {
  return {} as RenderTheme
}

const GraphIconButton = (props: {
  label: string
  icon: string
  onClick: () => void
  Icon?: IconComponent
}): JSX.Element => {
  const renderIcon = createIconRenderer(props.Icon)
  return (
    <button
      type="button"
      class="flex h-6 w-6 items-center justify-center rounded-sm text-text-base hover:bg-surface-base-hover"
      aria-label={props.label}
      onClick={props.onClick}
    >
      {renderIcon({ name: props.icon, size: "small" })}
    </button>
  )
}