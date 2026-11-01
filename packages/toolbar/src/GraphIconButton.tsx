/**
 * GraphIconButton - Icon button used throughout the toolbar.
 */

import type { JSX } from "solid-js"
import { createIconRenderer, type IconComponent } from "@spacegraphjs/shared/icons"

export interface GraphIconButtonProps {
  /** The button's accessible name; also its tooltip. */
  label: string
  /** The icon's name in the icon catalogue. */
  icon: string
  onClick: () => void
  /** A toggle's state; absent for a plain button. */
  pressed?: boolean
  disabled?: boolean
  /** The button's test contract, so a test can find it without its copy. */
  slot?: string
  /** Custom icon renderer. */
  Icon?: IconComponent
}

/**
 * The graph's icon button: a small ghost button whose icon is the affordance and whose label names
 * it — as the accessible name and as the tooltip.
 */
export function GraphIconButton(props: GraphIconButtonProps): JSX.Element {
  const { label, icon, onClick, pressed, disabled, slot, Icon } = props
  const renderIcon = Icon ?? createIconRenderer()

  return (
    <button
      type="button"
      class={`flex h-6 w-6 items-center justify-center rounded-sm transition-colors ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : pressed
          ? "bg-primary-weaker text-primary-base"
          : "text-text-base hover:bg-surface-base-hover"
      }`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      data-slot={slot}
      aria-pressed={pressed}
    >
      {renderIcon({ name: icon, size: "small" })}
    </button>
  )
}