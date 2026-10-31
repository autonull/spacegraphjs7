import { Kernel } from './kernel';

/**
 * Time-range filter options.
 */
export interface TimeFilterOptions {
  /** Start time (inclusive). */
  from?: number;
  /** End time (inclusive). */
  to?: number;
  /** The field in node.data that contains the timestamp. Default: 'time'. */
  timeField?: string;
}

/**
 * Filters a kernel by time range.
 * Keeps nodes that have a timestamp within the range, and edges where both source and target are kept.
 */
export function filterByTime(kernel: Kernel, options: TimeFilterOptions): Kernel {
  const { from, to, timeField = 'time' } = options;

  // If no time bounds specified, return original
  if (from === undefined && to === undefined) {
    return kernel;
  }

  // Find nodes within time range
  const keepNodeIds = new Set<string>();

  for (const node of kernel.nodes) {
    const timeValue = node.data?.[timeField];
    const time = typeof timeValue === 'number' ? timeValue : undefined;

    if (time === undefined) {
      // Nodes without time field are kept by default
      keepNodeIds.add(node.id);
      continue;
    }

    const afterFrom = from === undefined || time >= from;
    const beforeTo = to === undefined || time <= to;

    if (afterFrom && beforeTo) {
      keepNodeIds.add(node.id);
    }
  }

  // Filter edges to only include those where both source and target are kept
  const filteredEdges = kernel.edges.filter(
    (edge) => keepNodeIds.has(edge.source) && keepNodeIds.has(edge.target),
  );

  // Filter hyperedges
  const filteredHyperedges = kernel.hyperedges.filter((hyperedge) =>
    hyperedge.nodes.every((nodeId) => keepNodeIds.has(nodeId)),
  );

  return new Kernel({
    nodes: kernel.nodes.filter((node) => keepNodeIds.has(node.id)),
    edges: filteredEdges,
    hyperedges: filteredHyperedges,
    version: kernel.version,
  });
}

/**
 * Filters a kernel by node kinds.
 */
export function filterByKind(kernel: Kernel, kinds: string[]): Kernel {
  if (kinds.length === 0) return kernel;

  const kindSet = new Set(kinds);
  const keepNodeIds = new Set<string>();

  for (const node of kernel.nodes) {
    if (kindSet.has(node.kind)) {
      keepNodeIds.add(node.id);
    }
  }

  return new Kernel({
    nodes: kernel.nodes.filter((node) => keepNodeIds.has(node.id)),
    edges: kernel.edges.filter((edge) => keepNodeIds.has(edge.source) && keepNodeIds.has(edge.target)),
    hyperedges: kernel.hyperedges.filter((hyperedge) =>
      hyperedge.nodes.every((nodeId) => keepNodeIds.has(nodeId)),
    ),
    version: kernel.version,
  });
}

/**
 * Filters a kernel by edge kinds.
 */
export function filterByEdgeKind(kernel: Kernel, kinds: string[]): Kernel {
  if (kinds.length === 0) return kernel;

  const kindSet = new Set(kinds);
  const keepEdgeIds = new Set<string>();

  for (const edge of kernel.edges) {
    if (kindSet.has(edge.kind)) {
      keepEdgeIds.add(edge.id);
    }
  }

  // Keep nodes that are connected by kept edges
  const keepNodeIds = new Set<string>();
  for (const edge of kernel.edges) {
    if (keepEdgeIds.has(edge.id)) {
      keepNodeIds.add(edge.source);
      keepNodeIds.add(edge.target);
    }
  }

  return new Kernel({
    nodes: kernel.nodes.filter((node) => keepNodeIds.has(node.id)),
    edges: kernel.edges.filter((edge) => keepEdgeIds.has(edge.id)),
    hyperedges: kernel.hyperedges.filter((hyperedge) =>
      hyperedge.nodes.every((nodeId) => keepNodeIds.has(nodeId)),
    ),
    version: kernel.version,
  });
}