import { onCleanup, onMount } from "solid-js"
import { setupFocusTrap } from "./focus-trap"
import type { WindowItemProps } from "./types"

const WINDOW_MIN_WIDTH = 240
const WINDOW_MIN_HEIGHT = 160

export const WindowItem = (props: WindowItemProps) => {
  let element!: HTMLDivElement
  let focusTrapCleanup: (() => void) | undefined

  onMount(() => {
    focusTrapCleanup = setupFocusTrap(element, props.onClose)
    onCleanup(() => focusTrapCleanup?.())
  })

  return (
    <div
      ref={element}
      data-component="spacegraph-window"
      data-slot="spacegraph-window"
      data-window-id={props.window.id}
      data-window-kind={props.window.kind}
      role="dialog"
      aria-label={props.title}
      tabindex="0"
      class="pointer-events-auto absolute flex flex-col overflow-hidden rounded-md border border-v2-border-border-base bg-v2-background-bg-base shadow-lg outline-none"
      style={{
        "inset-inline-start": `${props.placement().left}px`,
        top: `${props.placement().top}px`,
        width: `${props.window.width}px`,
        height: `${props.window.height}px`,
        "z-index": props.window.z,
      }}
      onPointerDown={props.onRaise}
    >
      <div
        data-slot="spacegraph-window-title"
        class="flex h-8 shrink-0 cursor-grab items-center justify-between gap-2 border-b border-v2-border-border-base px-2"
        onPointerDown={props.onMove}
      >
        <span class="truncate text-12-medium text-text-strong">{props.title}</span>
        <button
          type="button"
          class="rounded-md p-1 text-text-weak hover:bg-v2-overlay-simple-overlay-hover hover:text-text-base"
          onClick={props.onClose}
          aria-label={props.closeLabel ?? "Close"}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 4L4 10M4 4L10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <div data-slot="spacegraph-window-body" class="min-h-0 flex-1 overflow-auto">
        {props.render()}
      </div>
      <div
        data-slot="spacegraph-window-resize"
        class="absolute bottom-0 inset-inline-end-0 h-3 w-3 cursor-se-resize"
        onPointerDown={props.onResize}
      />
    </div>
  )
}

export { WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT }