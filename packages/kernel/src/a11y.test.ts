import { describe, expect, test } from "bun:test"
import { buildA11ySupport } from "./a11y"
import { Kernel } from "./kernel"

describe("buildA11ySupport", () => {
  test("summarizes the graph", () => {
    const support = buildA11ySupport(
      new Kernel({
        nodes: [
          { id: "a", kind: "node", label: "Alpha" },
          { id: "b", kind: "node", label: "Beta" },
        ],
        edges: [{ id: "e", kind: "edge", source: "a", target: "b" }],
        hyperedges: [],
      }),
    )

    expect(support.summary).toBe("2 nodes, 1 edges across 1 kinds")
    expect(support.groups).toEqual([{ kind: "node", count: 2 }])
  })

  test("sorts entries by label and id", () => {
    const support = buildA11ySupport(
      new Kernel({
        nodes: [
          { id: "b", kind: "node", label: "Same" },
          { id: "a", kind: "node", label: "Same" },
          { id: "c", kind: "node", label: "Alpha" },
        ],
        edges: [],
        hyperedges: [],
      }),
    )

    expect(support.entries.map((item) => item.id)).toEqual(["c", "a", "b"])
    expect(support.entries[0]?.role).toBe("item")
  })

  test("handles an empty kernel", () => {
    expect(buildA11ySupport(new Kernel()).summary).toBe("0 nodes, 0 edges across 0 kinds")
  })
})
