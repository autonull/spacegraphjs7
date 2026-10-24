import type { Edge, Kernel, Node, NodeID } from './kernel';

export type QueryDirection = 'out' | 'in' | 'both';

export type GraphQuery = {
  nodes(predicate?: (node: Node) => boolean): Node[];
  edges(predicate?: (edge: Edge) => boolean): Edge[];
  traverse(start: NodeID, options?: TraverseOptions): Node[];
  path(from: NodeID, to: NodeID, options?: TraverseOptions): Node[] | undefined;
  count(predicate?: (node: Node) => boolean): number;
  collect<T>(collector: (graph: GraphQuery) => T): T;
};

export type TraverseOptions = {
  readonly direction?: QueryDirection;
  readonly edgeKind?: string;
  readonly maxDepth?: number;
};

const adjacency = (
  kernel: Kernel,
  direction: QueryDirection,
  edgeKind?: string,
): Map<NodeID, NodeID[]> => {
  const map = new Map<NodeID, NodeID[]>();
  const add = (from: NodeID, to: NodeID) => {
    const list = map.get(from);
    if (list) list.push(to);
    else map.set(from, [to]);
  };
  for (const edge of kernel.edges) {
    if (edgeKind !== undefined && edge.kind !== edgeKind) continue;
    if (direction === 'out' || direction === 'both') add(edge.source, edge.target);
    if (direction === 'in' || direction === 'both') add(edge.target, edge.source);
  }
  return map;
};

const traverseFrom = (
  kernel: Kernel,
  start: NodeID,
  options: TraverseOptions,
): NodeID[] => {
  if (!kernel.nodes.some((node) => node.id === start)) return [];
  const direction = options.direction ?? 'out';
  const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY;
  const links = adjacency(kernel, direction, options.edgeKind);
  const seen = new Set<NodeID>([start]);
  const order: NodeID[] = [start];
  const queue: { id: NodeID; depth: number }[] = [{ id: start, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;
    for (const next of links.get(current.id) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      order.push(next);
      queue.push({ id: next, depth: current.depth + 1 });
    }
  }

  return order;
};

export const query = (kernel: Kernel): GraphQuery => {
  const nodes = (predicate?: (node: Node) => boolean): Node[] =>
    predicate ? kernel.nodes.filter(predicate) : [...kernel.nodes];

  const edges = (predicate?: (edge: Edge) => boolean): Edge[] =>
    predicate ? kernel.edges.filter(predicate) : [...kernel.edges];

  const traverse = (start: NodeID, options: TraverseOptions = {}): Node[] => {
    const ids = traverseFrom(kernel, start, options);
    const byID = new Map(kernel.nodes.map((node) => [node.id, node]));
    return ids.flatMap((id) => {
      const node = byID.get(id);
      return node ? [node] : [];
    });
  };

  const path = (
    from: NodeID,
    to: NodeID,
    options: TraverseOptions = {},
  ): Node[] | undefined => {
    const byID = new Map(kernel.nodes.map((node) => [node.id, node]));
    if (!byID.has(from) || !byID.has(to)) return undefined;
    if (from === to) return [byID.get(from)!];

    const direction = options.direction ?? 'out';
    const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY;
    const links = adjacency(kernel, direction, options.edgeKind);
    const parent = new Map<NodeID, NodeID | undefined>([[from, undefined]]);
    const queue: { id: NodeID; depth: number }[] = [{ id: from, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= maxDepth) continue;
      for (const next of links.get(current.id) ?? []) {
        if (parent.has(next)) continue;
        parent.set(next, current.id);
        if (next === to) {
          const result: NodeID[] = [to];
          let cursor = current.id;
          while (cursor !== from) {
            result.unshift(cursor);
            cursor = parent.get(cursor)!;
          }
          result.unshift(from);
          return result.flatMap((id) => {
            const node = byID.get(id);
            return node ? [node] : [];
          });
        }
        queue.push({ id: next, depth: current.depth + 1 });
      }
    }

    return undefined;
  };

  const count = (predicate?: (node: Node) => boolean): number =>
    predicate ? kernel.nodes.filter(predicate).length : kernel.nodes.length;

  const collect = <T>(collector: (graph: GraphQuery) => T): T =>
    collector({ nodes, edges, traverse, path, count, collect });

  return { nodes, edges, traverse, path, count, collect };
};
