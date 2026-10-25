import type { Kernel, Node, Edge, NodeID } from './kernel';

/**
 * Walk specification for traversing a kernel graph.
 */
export type WalkSpec = {
  /** Starting node IDs. */
  starts: NodeID[];
  /** Edge kinds to traverse in each step. Empty = all kinds. */
  steps: string[];
  /** Maximum depth to traverse. Default: Infinity. */
  maxDepth?: number;
};

/**
 * Result of a walk operation.
 */
export type WalkResult = {
  /** Visited node IDs in order. */
  nodes: NodeID[];
  /** Traversed edge IDs in order. */
  edges: EdgeID[];
};

/**
 * Edge ID type.
 */
export type EdgeID = string;

/**
 * Walks the graph from start nodes, following edges of specified kinds.
 * Returns all visited nodes and edges up to maxDepth.
 */
export function walk(kernel: Kernel, spec: WalkSpec): WalkResult {
  const { starts, steps, maxDepth = Number.POSITIVE_INFINITY } = spec;
  const visitedNodes = new Set<NodeID>();
  const visitedEdges = new Set<EdgeID>();
  const nodeOrder: NodeID[] = [];
  const edgeOrder: EdgeID[] = [];

  // Build adjacency map for the specified edge kinds
  const adjacency = new Map<NodeID, { target: NodeID; edgeId: EdgeID; kind: string }[]>();

  for (const edge of kernel.edges) {
    if (steps.length > 0 && !steps.includes(edge.kind)) continue;

    const list = adjacency.get(edge.source);
    if (list) list.push({ target: edge.target, edgeId: edge.id, kind: edge.kind });
    else adjacency.set(edge.source, [{ target: edge.target, edgeId: edge.id, kind: edge.kind }]);
  }

  // BFS traversal - only start from nodes that exist in the kernel
  const queue: { id: NodeID; depth: number }[] = [];

  for (const start of starts) {
    if (!kernel.nodes.some((n) => n.id === start)) continue;
    if (!visitedNodes.has(start)) {
      visitedNodes.add(start);
      nodeOrder.push(start);
      queue.push({ id: start, depth: 0 });
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    const edges = adjacency.get(current.id);
    if (!edges) continue;

    for (const { target, edgeId } of edges) {
      if (!visitedEdges.has(edgeId)) {
        visitedEdges.add(edgeId);
        edgeOrder.push(edgeId);
      }

      if (!visitedNodes.has(target)) {
        visitedNodes.add(target);
        nodeOrder.push(target);
        queue.push({ id: target, depth: current.depth + 1 });
      }
    }
  }

  return { nodes: nodeOrder, edges: edgeOrder };
}

/**
 * Finds all paths between two nodes using BFS.
 * Returns an array of paths, where each path is an array of node IDs.
 * Follows directed edges only (source -> target).
 */
export function pathsBetween(kernel: Kernel, from: NodeID, to: NodeID): NodeID[][] {
  if (!kernel.nodes.some((node) => node.id === from)) return [];
  if (!kernel.nodes.some((node) => node.id === to)) return [];
  if (from === to) return [[from]];

  // Build adjacency (directed: source -> target)
  const adjacency = new Map<NodeID, NodeID[]>();
  for (const edge of kernel.edges) {
    const list = adjacency.get(edge.source);
    if (list) list.push(edge.target);
    else adjacency.set(edge.source, [edge.target]);
  }

  const paths: NodeID[][] = [];
  const queue: { path: NodeID[]; visited: Set<NodeID> }[] = [
    { path: [from], visited: new Set([from]) },
  ];

  while (queue.length > 0) {
    const { path, visited } = queue.shift()!;
    const current = path[path.length - 1];

    if (current === to) {
      paths.push(path);
      continue;
    }

    const neighbors = adjacency.get(current) ?? [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        queue.push({
          path: [...path, next],
          visited: new Set([...visited, next]),
        });
      }
    }
  }

  return paths;
}

/**
 * Default search scorer for ranking search results.
 * Priority: label prefix > label contains > name > path > body.
 * Ties are broken by model order (stable sort).
 */
export function defaultScorer(node: Node, needle: string): number {
  const lowerNeedle = needle.toLowerCase();
  const label = node.label.toLowerCase();
  if (label.startsWith(lowerNeedle)) return 0;
  if (label.includes(lowerNeedle)) return 1;

  // Check name field
  const name = node.data?.name as string | undefined;
  if (name?.toLowerCase().includes(lowerNeedle)) return 2;

  // Check path field
  const path = node.data?.path as string | undefined;
  if (path?.toLowerCase().includes(lowerNeedle)) return 3;

  // Check body (stringified data)
  const body = JSON.stringify(node.data ?? {}).toLowerCase();
  if (body.includes(lowerNeedle)) return 4;

  return -1; // No match
}