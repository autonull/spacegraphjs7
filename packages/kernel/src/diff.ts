import type { Edge, Hyperedge, Node } from "./kernel"

export type KernelChange<T> = {
  readonly id: string
  readonly before: T
  readonly after: T
}

export type KernelCollectionDiff<T> = {
  readonly added: readonly T[]
  readonly removed: readonly T[]
  readonly changed: readonly KernelChange<T>[]
}

export type KernelDiff = {
  readonly nodes: KernelCollectionDiff<Node>
  readonly edges: KernelCollectionDiff<Edge>
  readonly hyperedges: KernelCollectionDiff<Hyperedge>
}

const stable = (value: unknown): string => {
  if (value === undefined) return "undefined"
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`
  if (value !== null && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`)
      .join(",")}}`
  return JSON.stringify(value)
}

const diffByID = <T extends { readonly id: string }>(
  before: readonly T[],
  after: readonly T[],
): KernelCollectionDiff<T> => {
  const beforeByID = new Map(before.map((item) => [item.id, item]))
  const afterByID = new Map(after.map((item) => [item.id, item]))
  const added = after.filter((item) => !beforeByID.has(item.id))
  const removed = before.filter((item) => !afterByID.has(item.id))
  const changed = after.flatMap((item) => {
    const previous = beforeByID.get(item.id)
    if (!previous || stable(previous) === stable(item)) return []
    return [{ id: item.id, before: previous, after: item }]
  })
  return { added, removed, changed }
}

export const diffKernels = (before: { nodes: readonly Node[]; edges: readonly Edge[]; hyperedges: readonly Hyperedge[] }, after: { nodes: readonly Node[]; edges: readonly Edge[]; hyperedges: readonly Hyperedge[] }): KernelDiff => ({
  nodes: diffByID(before.nodes, after.nodes),
  edges: diffByID(before.edges, after.edges),
  hyperedges: diffByID(before.hyperedges, after.hyperedges),
})
