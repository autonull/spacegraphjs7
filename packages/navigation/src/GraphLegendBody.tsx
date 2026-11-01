import { RenderTheme, EqualizerRuleSet, Layout, GraphSnapshotMeta, VOCABULARY_KEYS, NODE_KINDS, NODE_STATUSES, PHASE_CATEGORIES, LANES } from "@spacegraphjs/shared"
import { IconProps, I18n } from "@spacegraphjs/shared"
import { createIconRenderer } from "@spacegraphjs/shared"
import { Show, type JSX } from "solid-js"
import { kindAccent, categoryAccent, statusAccent, formatAge, sourceLabel, CONFIDENCE_STYLE } from "./legendUtils"
import { GraphIconButton } from "./GraphIconButton"

const CONFIDENCE_STYLE_LOCAL = CONFIDENCE_STYLE

export type GraphLegendBodyProps = {
  theme: RenderTheme
  /** The layout on screen; the legend says what that layout encodes. */
  layout?: Layout
  /** The equalizer's rules, so the legend reads the same accents the cards do. */
  rules?: EqualizerRuleSet
  /** Snapshot metadata for provenance and missing sources. */
  snapshot?: GraphSnapshotMeta
  /** Edge kinds present in the map, with counts and visibility. */
  edgeKinds?: readonly { kind: string; count: number; hidden: boolean }[]
  onToggleEdgeKind?: (kind: string) => void
  /** i18n functions for localized strings. */
  i18n?: I18n
  /** Icon renderer for custom icons. */
  Icon?: (props: IconProps) => JSX.Element
}

/**
 * The legend's content, without the overlay around it, so a window can hold it. The legend
 * names every encoding the canvas draws; the colours come from the same helpers the card template
 * uses, so the legend cannot drift from the picture.
 */
export const GraphLegendBody = (props: GraphLegendBodyProps) => {
  const i18n = props.i18n ?? { t: (k: string) => k, plural: (k: string, _c: number, p?: Record<string, string>) => p ? k.replace(/\{(\w+)\}/g, (_m, key) => p[key] ?? "") : k }
  const Icon = props.Icon ?? createIconRenderer()
  const now = Date.now()

  const swatch = (color: string) => (
    <span class="h-3 w-3 shrink-0 rounded-sm" style={{ background: color }} aria-hidden="true" />
  )

  const line = (style: "solid" | "dashed") => (
    <span
      class="h-0 w-5 shrink-0 border-t-2"
      style={{ "border-color": props.theme.edge, "border-style": style }}
      aria-hidden="true"
    />
  )

  const section = (title: string, children: JSX.Element) => (
    <div class="mt-2 first:mt-0">
      <div class="text-12-regular text-text-weak">{title}</div>
      <div class="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">{children}</div>
    </div>
  )

  // Provenance sources section
  const snapshotAsOf = props.snapshot?.asOf
  const provenanceSources = snapshotAsOf
    ? Object.entries(snapshotAsOf).map(([source, asOf]) => (
        <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
          {swatch(props.theme.accent)}
          <span class="truncate">
            {i18n.t(sourceLabel(source))}
            {asOf !== undefined && (
              <span class="text-text-weak ml-1">{formatAge(now - asOf)}</span>
            )}
          </span>
        </span>
      ))
    : []

  // Missing sources section
  const missingSources = props.snapshot?.missing?.map((m) => (
    <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
      <span class="h-3 w-3 shrink-0 rounded-sm" style={{ background: props.theme.warning }} aria-hidden="true" />
      <span class="truncate">{i18n.t(sourceLabel(m.source))}</span>
      <span class="text-text-weak ml-1 truncate">{m.reason}</span>
    </span>
  ))

  return (
    <div class="min-h-0 flex-1 overflow-y-auto border-t border-border-weaker-base px-3 py-2">
      <p class="text-12-regular text-text-base">
        {props.layout ? i18n.t(VOCABULARY_KEYS.layoutHint[props.layout]) : ""}
      </p>
      <p class="mt-1 text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.legend.help")}</p>

      {section(
        i18n.t("ui.sessionGraph.legend.shortcuts"),
        [
          { key: "⌘/", label: i18n.t("ui.sessionGraph.legend.shortcut.search") },
          { key: "g", label: i18n.t("ui.sessionGraph.legend.shortcut.goTo") },
          { key: "f", label: i18n.t("ui.sessionGraph.legend.shortcut.fit") },
          { key: "1", label: i18n.t("ui.sessionGraph.legend.shortcut.levelOverview") },
          { key: "2", label: i18n.t("ui.sessionGraph.legend.shortcut.levelExecution") },
          { key: "3", label: i18n.t("ui.sessionGraph.legend.shortcut.levelDetail") },
          { key: "⌘z", label: i18n.t("ui.sessionGraph.legend.shortcut.undo") },
          { key: "⌘⇧z", label: i18n.t("ui.sessionGraph.legend.shortcut.redo") },
          { key: "n", label: i18n.t("ui.sessionGraph.legend.shortcut.note") },
          { key: "w", label: i18n.t("ui.sessionGraph.legend.shortcut.traceWhy") },
          { key: "e", label: i18n.t("ui.sessionGraph.legend.shortcut.traceLedHere") },
          { key: "r", label: i18n.t("ui.sessionGraph.legend.shortcut.traceRelated") },
          { key: "[ / ]", label: i18n.t("ui.sessionGraph.legend.shortcut.stepPrev") + " / " + i18n.t("ui.sessionGraph.legend.shortcut.stepNext") },
          { key: "⌘⌥t", label: i18n.t("ui.sessionGraph.legend.shortcut.turnMap") },
          { key: "⌘⇧h", label: i18n.t("ui.sessionGraph.legend.shortcut.hybrid") },
          { key: "⌘g", label: i18n.t("ui.sessionGraph.legend.shortcut.graph") },
        ].map(({ key, label }) => (
          <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
            <kbd class="px-1.5 py-0.5 text-11-regular text-text-weak bg-surface-base border border-border-weaker-base rounded-sm shrink-0 font-mono">{key}</kbd>
            <span class="truncate">{label}</span>
          </span>
        )),
      )}

      {section(
        i18n.t("ui.sessionGraph.legend.lanes"),
        LANES.map((lane) => (
          <span class="truncate text-12-regular text-text-base">{i18n.t(VOCABULARY_KEYS.lane[lane])}</span>
        )),
      )}

      {section(
        i18n.t("ui.sessionGraph.legend.kinds"),
        NODE_KINDS.map((kind: string) => (
          <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
            {swatch(kindAccent(kind, props.rules).solid)}
            <span class="truncate">{i18n.t(VOCABULARY_KEYS.kind[kind] ?? kind)}</span>
          </span>
        )),
      )}

      {section(
        i18n.t("ui.sessionGraph.legend.phases"),
        PHASE_CATEGORIES.map((category: string) => (
          <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
            {swatch(categoryAccent(category, props.rules).solid)}
            <span class="truncate">{i18n.t(`ui.sessionGraph.phase.${category}`)}</span>
          </span>
        )),
      )}

      {section(
        i18n.t("ui.sessionGraph.legend.lines"),
        (Object.keys(CONFIDENCE_STYLE_LOCAL) as (keyof typeof CONFIDENCE_STYLE_LOCAL)[]).map((confidence) => (
          <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
            {line(CONFIDENCE_STYLE_LOCAL[confidence])}
            <span class="truncate">{i18n.t(VOCABULARY_KEYS.confidence[confidence])}</span>
          </span>
        )),
      )}

      <Show when={(props.edgeKinds?.length ?? 0) > 0}>
        <div data-slot="graph-legend-edge-kinds" class="mt-2">
          <div class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.legend.edgeKinds")}</div>
          <div class="mt-1 flex flex-col">
            {props.edgeKinds?.map((entry) => (
              <button
                type="button"
                data-slot="graph-legend-edge-kind"
                data-kind={entry.kind}
                data-hidden={entry.hidden}
                aria-pressed={!entry.hidden}
                class="flex items-center gap-2 rounded-sm px-1 py-0.5 text-start text-12-regular text-text-base hover:bg-surface-base-hover"
                classList={{ "opacity-50": entry.hidden }}
                onClick={() => props.onToggleEdgeKind?.(entry.kind)}
              >
                <span class="truncate">
                  {i18n.t("ui.sessionGraph.legend.edgeKindCount", {
                    kind: i18n.t(VOCABULARY_KEYS.edge[entry.kind as keyof typeof VOCABULARY_KEYS.edge] ?? entry.kind),
                    count: String(entry.count),
                  })}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Show>

      {section(
        i18n.t("ui.sessionGraph.legend.status"),
        NODE_STATUSES.map((status: string) => (
          <span class="flex min-w-0 items-center gap-2 text-12-regular text-text-base">
            {swatch(statusAccent(props.theme, status))}
            <span class="truncate">{i18n.t(`ui.sessionGraph.status.${status}`)}</span>
          </span>
        )),
      )}

      {provenanceSources.length > 0 && section(
        i18n.t("ui.sessionGraph.legend.sources"),
        provenanceSources,
      )}

      {missingSources && missingSources.length > 0 && section(
        i18n.t("ui.sessionGraph.legend.missing"),
        missingSources,
      )}
    </div>
  )
}