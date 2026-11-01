import { describe, it, expect } from "vitest"
import { createIconRenderer } from "@spacegraphjs/shared/icons"
import { createPopoverRenderer } from "@spacegraphjs/shared/popover"
import { useToolbarState } from "@spacegraphjs/toolbar/hooks"

describe("shared icons", () => {
  it("creates an icon renderer", () => {
    const renderIcon = createIconRenderer()
    const icon = renderIcon({ name: "outline-eye", size: "small" })
    expect(icon).toBeDefined()
  })

  it("renders unknown icons as placeholder", () => {
    const renderIcon = createIconRenderer()
    const icon = renderIcon({ name: "unknown-icon", size: "small" })
    expect(icon).toBeDefined()
  })
})

describe("shared popover", () => {
  it("creates a popover renderer", () => {
    const Popover = createPopoverRenderer()
    expect(Popover).toBeDefined()
  })
})

describe("toolbar hooks", () => {
  it("creates toolbar state", () => {
    const state = useToolbarState()
    expect(state.level).toBeDefined()
    expect(state.setLevel).toBeDefined()
    expect(state.facets).toBeDefined()
    expect(state.setFacets).toBeDefined()
  })

  it("accepts initial values", () => {
    const state = useToolbarState({
      level: "overview",
      files: true,
    })
    expect(state.level()).toBe("overview")
    expect(state.files()).toBe(true)
  })
})