import { describe, expect, test } from "bun:test"
import { Kernel } from "./kernel"
import type { Edge, Node } from "./kernel"
import { deriveZoom } from "./zoom"

type Level = "overview" | "execution" | "detail"

const node = (id: string, level: Level): Node => ({
  id,
  kind: "node",
  label: id,
  data: { level },
})
const edge = (id: string, source: string, target: string): Edge => ({
  id,
  kind: "edge",
  source,
  target,
})

const kernel = new Kernel({
  nodes: [node("a", "overview"), node("b", "execution"), node("c", "detail")],
  edges: [edge("e1", "a", "b"), edge("e2", "b", "c")],
  hyperedges: [],
})

const options = {
  levelOf: (item: Node) => item.data?.level as Level,
  rank: { overview: 0, execution: 1, detail: 2 } as const,
}

describe("deriveZoom", () => {
  test("keeps nodes at or below the requested rank", () => {
    expect(deriveZoom(kernel, { ...options, level: "overview" }).nodes.map((item) => item.id)).toEqual([
      "a",
    ])
    expect(
      deriveZoom(kernel, { ...options, level: "execution" }).nodes.map((item) => item.id),
    ).toEqual(["a", "b"])
  })

  test("drops edges that leave the level", () => {
    const zoomed = deriveZoom(kernel, { ...options, level: "overview" })

    expect(zoomed.edges).toEqual([])
  })

  test("expansion overrides the table for one node", () => {
    const zoomed = deriveZoom(kernel, { ...options, level: "overview", expansion: new Set(["c"]) })

    expect(zoomed.nodes.map((item) => item.id)).toEqual(["a", "c"])
  })

  test("expansion accepts a predicate", () => {
    const zoomed = deriveZoom(kernel, {
      ...options,
      level: "overview",
      expansion: (item) => item.id === "b",
    })

    expect(zoomed.nodes.map((item) => item.id)).toEqual(["a", "b"])
    expect(zoomed.edges.map((item) => item.id)).toEqual(["e1"])
  })

  test("supports a rank function", () => {
    const zoomed = deriveZoom(kernel, {
      levelOf: (item) => item.data?.level as Level,
      rank: (level) => ({ overview: 0, execution: 1, detail: 2 })[level] ?? 99,
      level: "execution",
    })

    expect(zoomed.nodes.map((item) => item.id)).toEqual(["a", "b"])
  })
})
