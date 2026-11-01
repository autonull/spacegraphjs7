/**
 * GraphQuestionsControl - Questions/commands menu for the toolbar.
 */

import type { JSX } from "solid-js"
import { createIconRenderer, type IconComponent } from "@spacegraphjs/shared/icons"
import { createPopoverRenderer, type PopoverComponent } from "@spacegraphjs/shared/popover"
import type { I18n } from "@spacegraphjs/shared/i18n"
import { ToolbarMenu } from "./ToolbarMenu"

export interface GraphQuestionsControlProps {
  dispatchCommand?: (command: string) => void
  i18n: I18n
  Icon?: IconComponent
  Popover?: PopoverComponent
}

export function GraphQuestionsControl(props: GraphQuestionsControlProps): JSX.Element {
  const { dispatchCommand, i18n, Icon, Popover } = props
  const renderIcon = Icon ?? createIconRenderer()
  const PopoverComponent = Popover ?? createPopoverRenderer()

  const ask = (name: "why" | "led-here" | "related" | "compare" | "note" | "facets" | "failureProgress" | "find") => {
    if (dispatchCommand) {
      dispatchCommand(name)
      return
    }
    window.dispatchEvent(new CustomEvent("graph:command", { detail: { name } }))
  }

  const question = (
    name: "why" | "led-here" | "related" | "compare" | "note" | "facets" | "failureProgress" | "find",
    label: string,
  ) => (
    <button
      type="button"
      data-slot="graph-question-option"
      data-value={name}
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
      onClick={() => ask(name)}
    >
      {label}
    </button>
  )

  return (
    <ToolbarMenu
      slot="graph-toolbar-questions"
      label={i18n.t("ui.toolbar.questions.title")}
      icon="magnifying-glass"
      align="end"
      Popover={PopoverComponent}
    >
      {question("why", i18n.t("ui.toolbar.questions.why"))}
      {question("led-here", i18n.t("ui.toolbar.questions.ledHere"))}
      {question("related", i18n.t("ui.toolbar.questions.related"))}
      {question("compare", i18n.t("ui.toolbar.questions.compare"))}
      {question("note", i18n.t("ui.toolbar.questions.note"))}
      {question("facets", i18n.t("ui.toolbar.questions.facets"))}
      {question("failureProgress", i18n.t("ui.toolbar.questions.failureProgress"))}
      {question("find", i18n.t("ui.toolbar.questions.find"))}
    </ToolbarMenu>
  )
}