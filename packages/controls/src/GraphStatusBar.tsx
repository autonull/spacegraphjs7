import { createIconRenderer, type IconComponent } from "@spacegraphjs/shared/icons"
import type { I18n } from "@spacegraphjs/shared/i18n"
import { Show, type JSX } from "solid-js"

export type GraphStatusBarProps = {
  /** The i18n instance for translations. */
  i18n: I18n
  /** The icon component to use. */
  Icon?: IconComponent
  /** How many nodes the verbs act on. The bar is absent at zero. */
  count: number
  /** Callback to frame selection. */
  onFrame: () => void
  /** Callback to keep only selection. */
  onKeepOnly: () => void
  /** Callback to copy paths. */
  onCopyPaths: () => void
  /** Callback to export subset. */
  onExportSubset: () => void
  /** Callback to clear selection. */
  onClear: () => void
  /** C1: attach a note to the selected node. */
  onAddNote?: () => void
  /** B1: two turns are held; compare them, or clear the active comparison. */
  compare?: { active: boolean; onCompare: () => void; onClear: () => void }
  /** B2: the selected node is a group; the verbs collapse it or every other group. */
  group?: { collapsed: boolean; onToggle: () => void; onCollapseOthers: () => void }
}

/**
 * B1 — the selection is a set, not a click. Every verb is pure over the selected ids, so the bar
 * never owns state: it names what the reader can do with what they are holding.
 */
export const GraphStatusBar = (props: GraphStatusBarProps): JSX.Element => {
  const { i18n, Icon, ...rest } = props
  const renderIcon = createIconRenderer(Icon)

  return (
    <Show when={rest.count > 0}>
      <div
        data-component="spacegraph-status-bar"
        data-slot="graph-status-bar"
        data-selection-count={rest.count}
        class="flex flex-wrap items-center gap-2 border-b border-border-weaker-base bg-surface-base px-2 py-1 text-12-regular text-text-weak"
      >
        <span data-slot="graph-status-count" class="tabular-nums">
          {i18n.plural("ui.sessionGraph.status.count", rest.count)}
        </span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            data-slot="graph-status-frame"
            class="rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
            onClick={() => rest.onFrame()}
          >
            {i18n.t("ui.sessionGraph.status.frame")}
          </button>
          <button
            type="button"
            data-slot="graph-status-keep-only"
            class="rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
            onClick={() => rest.onKeepOnly()}
          >
            {i18n.t("ui.sessionGraph.status.keepOnly")}
          </button>
          <button
            type="button"
            data-slot="graph-status-copy-paths"
            class="rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
            onClick={() => rest.onCopyPaths()}
          >
            {i18n.t("ui.sessionGraph.status.copyPaths")}
          </button>
          <button
            type="button"
            data-slot="graph-status-export"
            class="rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
            onClick={() => rest.onExportSubset()}
          >
            {i18n.t("ui.sessionGraph.status.exportSubset")}
          </button>
          <Show when={rest.onAddNote}>
            <button
              type="button"
              data-slot="graph-status-add-note"
              class="rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
              onClick={() => rest.onAddNote?.()}
            >
              {i18n.t("ui.sessionGraph.note.add")}
            </button>
          </Show>
          <Show when={rest.compare}>
            {(compare) => (
              <button
                type="button"
                data-slot="graph-status-compare"
                data-active={compare().active}
                class="rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
                onClick={() => (compare().active ? compare().onClear() : compare().onCompare())}
              >
                {i18n.t(
                  compare().active
                    ? "ui.sessionGraph.compare.clear"
                    : "ui.sessionGraph.compare.turns",
                )}
              </button>
            )}
          </Show>
          <Show when={rest.group}>
            {(group) => (
              <>
                <button
                  type="button"
                  data-slot="graph-status-group-toggle"
                  data-collapsed={group().collapsed}
                  class="rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
                  onClick={() => group().onToggle()}
                >
                  {i18n.t(
                    group().collapsed
                      ? "ui.sessionGraph.status.expandGroup"
                      : "ui.sessionGraph.status.collapseGroup",
                  )}
                </button>
                <button
                  type="button"
                  data-slot="graph-status-group-others"
                  class="rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
                  onClick={() => group().onCollapseOthers()}
                >
                  {i18n.t("ui.sessionGraph.status.collapseOthers")}
                </button>
              </>
            )}
          </Show>
        </div>
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.status.clear")}
          icon="close-small"
          onClick={() => rest.onClear()}
          Icon={Icon}
        />
      </div>
    </Show>
  )
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