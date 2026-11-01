/**
 * GraphExportControl - Export control for the toolbar (SVG, JSON, HTML, copy view).
 */

import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { createIconRenderer, type IconComponent } from "@spacegraphjs/shared/icons"
import { createPopoverRenderer, type PopoverComponent } from "@spacegraphjs/shared/popover"
import type { I18n } from "@spacegraphjs/shared/i18n"
import type { RenderModel } from "@spacegraphjs/renderer"
import { GraphIconButton } from "./GraphIconButton"
import { ToolbarMenu } from "./ToolbarMenu"

export interface GraphExportControlProps {
  onExport?: (format: "svg" | "json" | "html", model: RenderModel) => void
  renderModel?: RenderModel
  onCopyView?: () => void
  i18n: I18n
  Icon?: IconComponent
  Popover?: PopoverComponent
}

export function GraphExportControl(props: GraphExportControlProps): JSX.Element {
  const { onExport, renderModel, onCopyView, i18n, Icon, Popover } = props
  const renderIcon = Icon ?? createIconRenderer()
  const PopoverComponent = Popover ?? createPopoverRenderer()

  const option = (input: {
    label: string
    onClick: () => void
    slot?: string
    value?: string
  }) => (
    <button
      type="button"
      data-slot={input.slot}
      data-value={input.value}
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
      onClick={(event) => {
        const menu = event.currentTarget.closest("details")
        if (menu) menu.open = false
        input.onClick()
      }}
    >
      {input.label}
    </button>
  )

  return (
    <>
      <Show when={onCopyView}>
        <GraphIconButton
          label={i18n.t("ui.toolbar.copyView")}
          icon="outline-copy"
          slot="graph-copy-view"
          onClick={() => onCopyView?.()}
          Icon={renderIcon}
        />
      </Show>
      <Show when={onExport && renderModel}>
        <ToolbarMenu
          slot="graph-toolbar-export"
          label={i18n.t("ui.toolbar.export")}
          icon="outline-share"
          Popover={PopoverComponent}
        >
          {option({
            label: i18n.t("ui.toolbar.exportSvg"),
            onClick: () => onExport?.("svg", renderModel!),
            slot: "graph-export-option",
            value: "svg",
          })}
          {option({
            label: i18n.t("ui.toolbar.exportJson"),
            onClick: () => onExport?.("json", renderModel!),
            slot: "graph-export-option",
            value: "json",
          })}
          {option({
            label: i18n.t("ui.toolbar.exportHtml"),
            onClick: () => onExport?.("html", renderModel!),
            slot: "graph-export-option",
            value: "html",
          })}
        </ToolbarMenu>
      </Show>
    </>
  )
}