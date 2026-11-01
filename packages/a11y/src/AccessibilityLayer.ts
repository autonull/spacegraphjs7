import type { AccessibleItem, AccessibleEdge, I18n } from "@spacegraphjs/shared"

/** Configuration for the AccessibilityLayer. */
export interface AccessibilityLayerConfig {
  /** The container element to render the accessibility layer into. */
  container: HTMLElement
  /** ARIA label for the accessibility layer. */
  label: string
  /** ARIA label for the edge list. */
  edgeLabel: string
  /** Callback when a node is selected. */
  onSelect: (id: string) => void
  /** Callback when Escape is pressed. */
  onEscape?: () => void
  /** Formats the selection announcement. */
  formatSelection: (labels: readonly string[]) => string
  /** Formats the edge connections announcement. */
  edgeAnnouncer: (connections: readonly AccessibleEdge[]) => string
  /** i18n functions for localized strings. */
  i18n?: I18n
}

/**
 * The accessibility mirror - a visually hidden, ordered node list with roving tabindex,
 * arrow traversal, Enter/Space selection, Escape, and an aria-live announcement.
 * This allows keyboard users to reach every node the canvas draws.
 */
export class AccessibilityLayer {
  private container: HTMLElement
  private config: AccessibilityLayerConfig
  private items: AccessibleItem[] = []
  private edges: AccessibleEdge[] = []
  private selected: readonly string[] | null = null
  private announced: string | undefined
  private listElement: HTMLUListElement | null = null
  private focusedIndex = -1
  private liveRegion: HTMLDivElement | null = null
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null

  constructor(config: AccessibilityLayerConfig) {
    this.config = config
    this.container = config.container
    this.init()
  }

  private init(): void {
    // Create the visually hidden container
    const wrapper = document.createElement("div")
    wrapper.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `
    wrapper.setAttribute("role", "application")
    wrapper.setAttribute("aria-label", this.config.label)

    // Create the live region for announcements
    this.liveRegion = document.createElement("div")
    this.liveRegion.setAttribute("aria-live", "polite")
    this.liveRegion.setAttribute("aria-atomic", "true")
    this.liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `
    wrapper.appendChild(this.liveRegion)

    // Create the list
    this.listElement = document.createElement("ul")
    this.listElement.setAttribute("role", "listbox")
    this.listElement.setAttribute("aria-label", this.config.edgeLabel)
    wrapper.appendChild(this.listElement)

    this.container.appendChild(wrapper)

    // Set up keyboard handler
    this.keydownHandler = this.handleKeyDown.bind(this)
    this.container.addEventListener("keydown", this.keydownHandler)
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.items.length === 0) return

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        this.moveFocus(1)
        break
      case "ArrowUp":
        event.preventDefault()
        this.moveFocus(-1)
        break
      case "Enter":
      case " ":
        event.preventDefault()
        this.selectFocused()
        break
      case "Escape":
        event.preventDefault()
        this.config.onEscape?.()
        break
      case "Home":
        event.preventDefault()
        this.moveFocusTo(0)
        break
      case "End":
        event.preventDefault()
        this.moveFocusTo(this.items.length - 1)
        break
    }
  }

  private moveFocus(delta: number): void {
    const newIndex = Math.max(0, Math.min(this.items.length - 1, this.focusedIndex + delta))
    this.moveFocusTo(newIndex)
  }

  private moveFocusTo(index: number): void {
    this.focusedIndex = index
    this.render()
    this.announceItem(this.items[index])
  }

  private selectFocused(): void {
    if (this.focusedIndex >= 0 && this.focusedIndex < this.items.length) {
      const item = this.items[this.focusedIndex]
      this.config.onSelect(item.id)
      this.setSelected([item.id])
    }
  }

  private announceInternal(message: string): void {
    if (this.liveRegion) {
      this.liveRegion.textContent = message
    }
  }

  private announceItem(item: AccessibleItem): void {
    const parts = [item.label]
    if (item.kind) parts.push(item.kind)
    if (item.status) parts.push(item.status)
    this.announceInternal(parts.join(", "))
  }

  private render(): void {
    if (!this.listElement) return

    this.listElement.innerHTML = ""

    this.items.forEach((item, index) => {
      const li = document.createElement("li")
      li.setAttribute("role", "option")
      li.setAttribute("aria-selected", String(this.selected?.includes(item.id) ?? false))
      li.setAttribute("tabindex", index === this.focusedIndex ? "0" : "-1")
      li.textContent = `${item.label}${item.kind ? `, ${item.kind}` : ""}${item.status ? `, ${item.status}` : ""}`
      li.addEventListener("click", () => this.config.onSelect(item.id))
      li.addEventListener("focus", () => (this.focusedIndex = index))
      this.listElement!.appendChild(li)
    })
  }

  /** Sets the items to display in the accessibility layer. */
  setItems(items: AccessibleItem[]): void {
    this.items = items
    if (this.focusedIndex >= this.items.length) {
      this.focusedIndex = this.items.length - 1
    }
    this.render()
  }

  /** Sets the edges for connection announcements. */
  setEdges(edges: AccessibleEdge[]): void {
    this.edges = edges
  }

  /** Sets the selected nodes and announces the change. */
  setSelected(selected: readonly string[] | null): void {
    this.selected = selected
    this.render()
    if (selected) {
      const labels = selected.map((id) => this.items.find((item) => item.id === id)?.label).filter((l): l is string => !!l)
      this.announceInternal(this.config.formatSelection(labels))
    } else {
      this.announceInternal(this.config.formatSelection([]))
    }
  }

  /** Announces a message to screen readers. */
  announce(message: string): void {
    if (message && message !== this.announced) {
      this.announced = message
      this.announceInternal(message)
    }
  }

  /** Disposes of the accessibility layer. */
  dispose(): void {
    if (this.keydownHandler) {
      this.container.removeEventListener("keydown", this.keydownHandler)
      this.keydownHandler = null
    }
    const wrapper = this.container.querySelector("div[role='application']")
    if (wrapper) {
      wrapper.remove()
    }
    this.listElement = null
    this.liveRegion = null
  }
}