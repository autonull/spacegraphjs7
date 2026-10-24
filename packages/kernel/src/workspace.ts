import { Kernel } from './kernel';
import type { Edge, EdgeID, Hyperedge, HyperedgeID, Node, NodeID } from './kernel';

export type WorkspaceKernelShape = {
  readonly kernel: Kernel;
  readonly clock?: Readonly<Record<string, number>>;
};

const nodeKey = (id: NodeID) => `node:${id}`;
const edgeKey = (id: EdgeID) => `edge:${id}`;
const hyperedgeKey = (id: HyperedgeID) => `hyper:${id}`;

export class WorkspaceKernel {
  readonly kernel: Kernel;
  readonly clock: ReadonlyMap<string, number>;

  constructor(shape: WorkspaceKernelShape) {
    this.kernel = shape.kernel;
    this.clock = new Map(Object.entries(shape.clock ?? {}));
  }

  static from(kernel: Kernel): WorkspaceKernel {
    return new WorkspaceKernel({ kernel });
  }

  replaceFrom(kernel: Kernel): WorkspaceKernel {
    const at = Math.max(this.kernel.version, kernel.version) + 1;
    const clock: Record<string, number> = {};
    for (const node of kernel.nodes) clock[nodeKey(node.id)] = at;
    for (const edge of kernel.edges) clock[edgeKey(edge.id)] = at;
    for (const hyperedge of kernel.hyperedges) clock[hyperedgeKey(hyperedge.id)] = at;
    return new WorkspaceKernel({ kernel, clock });
  }

  merge(other: WorkspaceKernel): WorkspaceKernel {
    const at = Math.max(this.kernel.version, other.kernel.version) + 1;
    const clock = new Map(this.clock);
    const nodes = new Map<NodeID, Node>(this.kernel.nodes.map((node) => [node.id, node]));
    const edges = new Map<EdgeID, Edge>(this.kernel.edges.map((edge) => [edge.id, edge]));
    const hyperedges = new Map<HyperedgeID, Hyperedge>(
      this.kernel.hyperedges.map((hyperedge) => [hyperedge.id, hyperedge]),
    );

    const mergeElements = <ID, T extends { id: ID }>(
      keyOf: (id: ID) => string,
      target: Map<ID, T>,
      source: readonly T[],
      sourceClock: ReadonlyMap<string, number>,
      ownClock: ReadonlyMap<string, number>,
    ) => {
      for (const element of source) {
        const key = keyOf(element.id);
        const incoming = sourceClock.get(key) ?? 0;
        const current = ownClock.get(key) ?? -Infinity;
        if (!target.has(element.id) || incoming > current) target.set(element.id, element);
        clock.set(key, Math.max(clock.get(key) ?? 0, incoming));
      }
    };

    mergeElements(nodeKey, nodes, other.kernel.nodes, other.clock, this.clock);
    mergeElements(edgeKey, edges, other.kernel.edges, other.clock, this.clock);
    mergeElements(hyperedgeKey, hyperedges, other.kernel.hyperedges, other.clock, this.clock);

    return new WorkspaceKernel({
      kernel: new Kernel({
        nodes: [...nodes.values()],
        edges: [...edges.values()],
        hyperedges: [...hyperedges.values()],
        version: at,
      }),
      clock: Object.fromEntries(clock),
    });
  }
}
