/**
 * ToolbarMenu - A dropdown menu for the toolbar.
 * Uses native <details>/<summary> for accessibility.
 */

import type { JSX } from "solid-js"
import { createIconRenderer, type IconComponent } from "@spacegraphjs/shared/icons"
import { createPopoverRenderer, type PopoverComponent } from "@spacegraphjs/shared/popover"

export interface ToolbarMenuProps {
  /** Unique slot identifier for testing. */
  slot: string
  /** Label for accessibility. */
  label: string
  /** Icon name for the trigger button. */
  icon: string
  /** Current value to display (optional). */
  value?: string
  /** Slot for the value display (optional). */
  valueSlot?: string
  /** Alignment of the popover content. */
  align?: "start" | "end"
  /** Children content. */
  children: JSX.Element
  /** Custom popover component (optional). */
  Popover?: PopoverComponent
}

/**
 * Default toolbar menu using native details/summary.
 * Hosts can provide their own Popover and Icon components via props.
 */
export function ToolbarMenu(props: ToolbarMenuProps): JSX.Element {
  const { slot, label, icon, value, valueSlot, align = "start", children, Popover } = props

  const PopoverComponent = Popover ?? createPopoverRenderer()

  return (
    <PopoverComponent
      slot={slot}
      label={label}
      icon={icon}
      value={value}
      valueSlot={valueSlot}
      align={align}
    >
      {children}
    </PopoverComponent>
  )
}