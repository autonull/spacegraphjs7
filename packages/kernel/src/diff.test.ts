import { describe, expect, test } from "bun:test"
import { diffKernels } from "./diff"
import { Kernel } from "./kernel"
import type { Edge, Node } from "./kernel"

const node = (id: string, label = id): Node => ({ id, kind: "node", label })
const edge = (id: string, source: string, target: string): Edge => ({
  id,
  kind: "edge",
  source,
  target,
})

describe("diffKernels", () => {
  test("is id-based and order-insensitive", () => {
    const before = new Kernel({ nodes: [node("a"), node("b")], edges: [edge("e1", "a", "b")], hyperedges: [] })
    const after = new Kernel({ nodes: [node("b"), node("a"), node("c")], edges: [edge("e1", "a", "b")], hyperedges: [] })
    const diff = diffKernels(before, after)

    expect(diff.nodes.added.map((item) => item.id)).toEqual(["c"])
    expect(diff.nodes.removed).toEqual([])
    expect(diff.nodes.changed).toEqual([])
    expect(diff.edges.added).toEqual([])
  })

  test("reports added, removed and changed elements", () => {
    const before = new Kernel({
      nodes: [node("a", "old"), node("b")],
      edges: [edge("e1", "a", "b")],
      hyperedges: [],
    })
    const after = new Kernel({
      nodes: [node("a", "new"), node("c")],
      edges: [edge("e2", "a", "c")],
      hyperedges: [],
    })
    const diff = diffKernels(before, after)

    expect(diff.nodes.added.map((item) => item.id)).toEqual(["c"])
    expect(diff.nodes.removed.map((item) => item.id)).toEqual(["b"])
    expect(diff.nodes.changed.map((item) => item.id)).toEqual(["a"])
    expect(diff.nodes.changed[0]?.before.label).toBe("old")
    expect(diff.nodes.changed[0]?.after.label).toBe("new")
    expect(diff.edges.added.map((item) => item.id)).toEqual(["e2"])
    expect(diff.edges.removed.map((item) => item.id)).toEqual(["e1"])
  })

  test("does not report a change when data key order differs", () => {
    const before = new Kernel({
      nodes: [{ id: "a", kind: "node", label: "A", data: { x: 1, y: 2 } }],
      edges: [],
      hyperedges: [],
    })
    const after = new Kernel({
      nodes: [{ id: "a", kind: "node", label: "A", data: { y: 2, x: 1 } }],
      edges: [],
      hyperedges: [],
    })

    expect(diffKernels(before, after).nodes.changed).toEqual([])
  })

  test("diffs hyperedges", () => {
    const before = new Kernel({
      nodes: [],
      edges: [],
      hyperedges: [{ id: "h1", kind: "hyper", nodes: ["a"] }],
    })
    const after = new Kernel({
      nodes: [],
      edges: [],
      hyperedges: [{ id: "h1", kind: "hyper", nodes: ["a", "b"] }],
    })

    expect(diffKernels(before, after).hyperedges.changed.map((item) => item.id)).toEqual(["h1"])
  })
})
