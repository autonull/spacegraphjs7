import type { Kernel, Node } from "./kernel"

export type A11yEntry = {
  readonly id: string
  readonly kind: string
  readonly label: string
  readonly role: "item"
}

export type A11yGroup = {
  readonly kind: string
  readonly count: number
}

export type A11ySupport = {
  readonly summary: string
  readonly entries: readonly A11yEntry[]
  readonly groups: readonly A11yGroup[]
}

const entry = (node: Node): A11yEntry => ({
  id: node.id,
  kind: node.kind,
  label: node.label,
  role: "item",
})

export const buildA11ySupport = (kernel: Kernel): A11ySupport => {
  const counts = new Map<string, number>()
  for (const node of kernel.nodes) counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1)
  const groups = [...counts].map(([kind, count]) => ({ kind, count })).sort((a, b) => a.kind.localeCompare(b.kind))
  const entries = kernel.nodes.map(entry).sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
  return {
    summary: `${kernel.nodes.length} nodes, ${kernel.edges.length} edges across ${groups.length} kinds`,
    entries,
    groups,
  }
}
