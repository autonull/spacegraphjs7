import { Show } from "solid-js"
import type { InspectorProps } from "./types"
import { ProvenanceDisplay } from "./ProvenanceDisplay"
import { OutputDisplay } from "./OutputDisplay"

export const Inspector = (props: InspectorProps) => {
  const now = Date.now()

  if (!props.node) {
    return (
      <aside
        data-component="spacegraph-inspector"
        data-slot="spacegraph-inspector"
        class="flex h-full w-full flex-col overflow-hidden border-l border-v2-border-border-base"
        aria-label={props.t("panel.inspectorTitle")}
      >
        <div class="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
          <span class="text-14-regular text-text-weak">{props.t("panel.inspectorEmpty")}</span>
          <span class="text-12-regular text-text-weaker">{props.t("panel.inspectorEmptyHint")}</span>
        </div>
      </aside>
    )
  }

  const node = props.node

  return (
    <aside
      data-component="spacegraph-inspector"
      data-slot="spacegraph-inspector"
      class="flex h-full w-full flex-col overflow-hidden border-l border-v2-border-border-base"
      aria-label={props.t("panel.inspectorTitle")}
    >
      <div class="flex min-h-0 flex-1 flex-col p-4">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-14-medium text-text-strong">{node.label}</span>
          <Show when={!!node.kind}>
            <span class="rounded-full bg-v2-overlay-simple-overlay-hover px-2 py-0.5 text-11-regular text-text-weak">
              {node.kind}
            </span>
          </Show>
        </div>

        <Show when={!!node.summary}>
          <div class="mb-4 text-13-regular text-text-base">{node.summary}</div>
        </Show>

        <ProvenanceDisplay
          provenance={node.provenance}
          now={now}
          t={props.t}
          formatProvenance={props.formatProvenance}
        />

        <OutputDisplay
          output={node.data?.output as string | undefined}
          t={props.t}
          formatOutput={props.formatOutput}
        />

        <Show when={!!props.onSelect}>
          <button
            type="button"
            class="rounded-md border border-v2-border-border-base px-3 py-1.5 text-13-regular text-text-base hover:bg-v2-overlay-simple-overlay-hover"
            onClick={() => props.onSelect?.(node.id)}
          >
            {props.t("panel.inspectorFocus")}
          </button>
        </Show>
      </div>
    </aside>
  )
}

export type { InspectorProps } from "./types"
export { ProvenanceDisplay } from "./ProvenanceDisplay"
export { OutputDisplay } from "./OutputDisplay"
export { sourceLabel, formatAge, defaultFormatProvenance } from "./ProvenanceDisplay"
export { defaultFormatOutput } from "./OutputDisplay"