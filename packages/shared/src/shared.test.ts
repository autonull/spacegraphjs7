import { describe, it, expect } from "vitest"
import { createIconRenderer } from "@spacegraphjs/shared/icons"
import { createPopoverRenderer } from "@spacegraphjs/shared/popover"
import { cx, cn, styleVar, generateId, fixedSize, absolutePosition } from "@spacegraphjs/shared/css"
import { useToggle, useDebounce, useLocalStorage } from "@spacegraphjs/shared/hooks"

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

describe("shared css utilities", () => {
  it("concatenates class names", () => {
    expect(cx("a", "b")).toBe("a b")
    expect(cx("a", false && "b")).toBe("a")
    expect(cx({ a: true, b: false })).toBe("a")
  })

  it("creates CSS variable references", () => {
    expect(styleVar("color-primary")).toBe("var(--color-primary)")
    expect(styleVar("color-primary", "red")).toBe("var(--color-primary, red)")
  })

  it("generates unique IDs", () => {
    const id1 = generateId("test")
    const id2 = generateId("test")
    expect(id1).not.toBe(id2)
    expect(id1.startsWith("test-")).toBe(true)
  })

  it("creates fixed size styles", () => {
    const style = fixedSize(100, 200)
    expect(style.width).toBe("100px")
    expect(style.height).toBe("200px")
  })

  it("creates absolute position styles", () => {
    const style = absolutePosition(10, 20, 30, 40)
    expect(style.top).toBe("10px")
    expect(style.left).toBe("20px")
    expect(style.right).toBe("30px")
    expect(style.bottom).toBe("40px")
  })
})

describe("shared hooks", () => {
  it("creates toggle hook", () => {
    const [value, toggle, setTrue, setFalse] = useToggle(false)
    expect(value()).toBe(false)
    toggle()
    expect(value()).toBe(true)
    setFalse()
    expect(value()).toBe(false)
    setTrue()
    expect(value()).toBe(true)
  })

  it("debounces values", () => {
    let currentValue = 0
    const debounced = useDebounce(() => currentValue, 50)
    expect(typeof debounced).toBe("function")
    expect(debounced()).toBe(0)
  })

  it("uses localStorage", () => {
    // Test that the hook returns the correct types
    const result = useLocalStorage("test-key-shared-" + Date.now(), "default")
    expect(result).toBeDefined()
    expect(typeof result[0]).toBe("function") // Accessor
    expect(typeof result[1]).toBe("function") // Setter
  })
})