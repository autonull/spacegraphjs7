import type { Kernel, Node, NodeID } from "./kernel"

export type ZoomLevel = string

export type ZoomOptions<Level extends ZoomLevel> = {
  readonly levelOf: (node: Node) => Level
  readonly rank: Readonly<Record<Level, number>> | ((level: Level) => number)
  readonly level: Level
  readonly expansion?: ReadonlySet<NodeID> | ((node: Node) => boolean)
}

const rankOf = <Level extends ZoomLevel>(rank: ZoomOptions<Level>["rank"], level: Level): number =>
  typeof rank === "function" ? rank(level) : (rank[level] ?? Number.POSITIVE_INFINITY)

export const deriveZoom = <Level extends ZoomLevel>(
  kernel: Kernel,
  options: ZoomOptions<Level>,
): Kernel => {
  const limit = rankOf(options.rank, options.level)
  const expansion = options.expansion
  const expanded =
    expansion === undefined
      ? () => false
      : typeof expansion === "function"
        ? expansion
        : (node: Node) => expansion.has(node.id)
  return kernel.subgraph(
    kernel.nodes
      .filter((node) => expanded(node) || rankOf(options.rank, options.levelOf(node)) <= limit)
      .map((node) => node.id),
  )
}
