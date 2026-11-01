/**
 * GraphShowControl - Show options for the toolbar (manual history, detail mode, peek, follow log, windows, legend, gallery, turn map, expand).
 */

import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { createIconRenderer, type IconComponent } from "@spacegraphjs/shared/icons"
import { createPopoverRenderer, type PopoverComponent } from "@spacegraphjs/shared/popover"
import type { I18n } from "@spacegraphjs/shared/i18n"
import type { DetailMode, GraphViewData } from "@spacegraphjs/shared/types"
import { ToolbarMenu } from "./ToolbarMenu"
import { DETAIL_MODES, VOCABULARY_KEYS } from "@spacegraphjs/shared/types"
import { GraphIconButton } from "./GraphIconButton"

export interface GraphShowControlProps {
  manualHistoryLength?: number
  manualFutureLength?: number
  onUndoManual?: () => void
  onRedoManual?: () => void
  detailMode?: DetailMode
  onDetailModeChange?: (mode: DetailMode) => void
  peek?: boolean
  onTogglePeek?: () => void
  followLog?: boolean
  onFollowLogChange?: (follow: boolean) => void
  onOpenWindow?: (kind: string, nodeID?: string) => void
  model?: GraphViewData
  legend?: boolean
  onToggleLegend?: () => void
  gallery?: boolean
  onToggleGallery?: () => void
  onTurnMap?: () => void
  onExpandGraph?: () => void
  i18n: I18n
  Icon?: IconComponent
  Popover?: PopoverComponent
}

export function GraphShowControl(props: GraphShowControlProps): JSX.Element {
  const { i18n, Icon, Popover, ...rest } = props
  const renderIcon = Icon ?? createIconRenderer()
  const PopoverComponent = Popover ?? createPopoverRenderer()

  const option = (input: {
    label: string
    onClick: () => void
    pressed?: boolean
    slot?: string
    keepOpen?: boolean
    ariaLabel?: string
    value?: string
  }) => (
    <button
      type="button"
      data-slot={input.slot}
      data-value={input.value}
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
      aria-pressed={input.pressed}
      aria-label={input.ariaLabel ?? input.label}
      onClick={(event) => {
        if (!input.keepOpen) {
          const menu = event.currentTarget.closest("details")
          if (menu) menu.open = false
        }
        input.onClick()
      }}
    >
      {input.label}
    </button>
  )

  return (
    <>
      <Show when={rest.manualHistoryLength !== undefined || rest.manualFutureLength !== undefined}>
        <div data-slot="graph-toolbar-manual-history">
          <GraphIconButton
            label={i18n.t("ui.toolbar.undo")}
            icon="outline-undo"
            onClick={rest.onUndoManual ?? (() => {})}
            disabled={(rest.manualHistoryLength ?? 0) === 0}
            slot="graph-undo-option"
            Icon={renderIcon}
          />
          <GraphIconButton
            label={i18n.t("ui.toolbar.redo")}
            icon="outline-redo"
            onClick={rest.onRedoManual ?? (() => {})}
            disabled={(rest.manualFutureLength ?? 0) === 0}
            slot="graph-redo-option"
            Icon={renderIcon}
          />
        </div>
      </Show>
      <Show when={rest.onDetailModeChange}>
        <div data-slot="graph-toolbar-detail">
          <div class="px-2 py-1 text-12-regular text-text-weak">
            {i18n.t("ui.toolbar.detailMode")}
          </div>
          {DETAIL_MODES.map((mode) =>
            option({
              label: i18n.t(VOCABULARY_KEYS.detailMode[mode]),
              onClick: () => rest.onDetailModeChange?.(mode),
              pressed: rest.detailMode === mode,
              slot: "graph-detail-mode-option",
              value: mode,
            }),
          )}
        </div>
      </Show>
      <Show when={rest.onTogglePeek}>
        {option({
          label: i18n.t("ui.toolbar.peek"),
          onClick: () => rest.onTogglePeek?.(),
          pressed: rest.peek,
          slot: "graph-peek-option",
          keepOpen: true,
        })}
      </Show>
      <Show when={rest.onFollowLogChange}>
        {option({
          label: rest.followLog ? i18n.t("ui.toolbar.followLog") : i18n.t("ui.toolbar.followLogOff"),
          onClick: () => rest.onFollowLogChange?.(!rest.followLog),
          pressed: rest.followLog,
          slot: "graph-follow-log-option",
          keepOpen: true,
          ariaLabel: i18n.t("ui.toolbar.followLog"),
        })}
      </Show>
      <Show when={rest.onOpenWindow}>
        <GraphIconButton
          label={i18n.t("ui.toolbar.minimap")}
          icon="layout-bottom"
          onClick={() => rest.onOpenWindow?.("minimap")}
          Icon={renderIcon}
        />
      </Show>
      <Show when={rest.onOpenWindow && rest.model?.workspaceRoot}>
        <GraphIconButton
          label={i18n.t("ui.toolbar.filesystem")}
          icon="folder-tree"
          onClick={() => rest.onOpenWindow?.("filesystem")}
          Icon={renderIcon}
        />
      </Show>
      <Show when={rest.onToggleLegend}>
        <GraphIconButton
          label={i18n.t("ui.toolbar.legend")}
          icon="outline-sliders"
          pressed={rest.legend}
          onClick={() => rest.onToggleLegend?.()}
          Icon={renderIcon}
        />
      </Show>
      <Show when={rest.onToggleGallery}>
        <GraphIconButton
          label={i18n.t("ui.toolbar.gallery")}
          icon="dot-grid"
          pressed={rest.gallery}
          onClick={() => rest.onToggleGallery?.()}
          Icon={renderIcon}
        />
      </Show>
      <Show when={rest.onTurnMap}>
        <GraphIconButton
          label={i18n.t("ui.toolbar.turnMap")}
          icon="outline-worktree"
          onClick={() => rest.onTurnMap?.()}
          Icon={renderIcon}
        />
      </Show>
      <Show when={rest.onExpandGraph}>
        <GraphIconButton
          label={i18n.t("ui.toolbar.expandGraph")}
          icon="arrow-up-right"
          onClick={() => rest.onExpandGraph?.()}
          Icon={renderIcon}
        />
      </Show>
    </>
  )
}