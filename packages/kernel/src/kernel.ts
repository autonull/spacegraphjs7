export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type NodeID = string;
export type EdgeID = string;
export type HyperedgeID = string;

export type Node = {
  readonly id: NodeID;
  readonly kind: string;
  readonly label: string;
  readonly data?: Readonly<Record<string, JsonValue>>;
};

export type Edge = {
  readonly id: EdgeID;
  readonly kind: string;
  readonly source: NodeID;
  readonly target: NodeID;
  readonly data?: Readonly<Record<string, JsonValue>>;
};

export type Hyperedge = {
  readonly id: HyperedgeID;
  readonly kind: string;
  readonly nodes: readonly NodeID[];
  readonly data?: Readonly<Record<string, JsonValue>>;
};

export type Diagnostics = {
  readonly danglingEdges: readonly EdgeID[];
  readonly duplicateNodes: readonly NodeID[];
  readonly duplicateEdges: readonly EdgeID[];
  readonly hyperedgeMissingNodes: readonly {
    readonly hyperedge: HyperedgeID;
    readonly node: NodeID;
  }[];
};

export type KernelBuilder = {
  readonly nodes: Map<NodeID, Node>;
  readonly edges: Map<EdgeID, Edge>;
  readonly hyperedges: Map<HyperedgeID, Hyperedge>;
};

export type KernelShape = {
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
  readonly hyperedges: readonly Hyperedge[];
  readonly version?: number;
};

const emptyKernel = (): KernelShape => ({
  nodes: [],
  edges: [],
  hyperedges: [],
  version: 0,
});

export class Kernel {
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
  readonly hyperedges: readonly Hyperedge[];
  readonly version: number;

  constructor(shape: KernelShape = emptyKernel()) {
    this.nodes = [...shape.nodes];
    this.edges = [...shape.edges];
    this.hyperedges = [...shape.hyperedges];
    this.version = shape.version ?? 0;
  }

  modify(build: (builder: KernelBuilder) => void): Kernel {
    const builder: KernelBuilder = {
      nodes: new Map(this.nodes.map((node) => [node.id, node])),
      edges: new Map(this.edges.map((edge) => [edge.id, edge])),
      hyperedges: new Map(this.hyperedges.map((hyperedge) => [hyperedge.id, hyperedge])),
    };
    build(builder);
    return new Kernel({
      nodes: [...builder.nodes.values()],
      edges: [...builder.edges.values()],
      hyperedges: [...builder.hyperedges.values()],
      version: this.version + 1,
    });
  }

  diagnostics(): Diagnostics {
    const nodeIDs = new Set<string>();
    const duplicateNodes: NodeID[] = [];
    for (const node of this.nodes) {
      if (nodeIDs.has(node.id)) duplicateNodes.push(node.id);
      nodeIDs.add(node.id);
    }

    const edgeIDs = new Set<string>();
    const duplicateEdges: EdgeID[] = [];
    const danglingEdges: EdgeID[] = [];
    for (const edge of this.edges) {
      if (edgeIDs.has(edge.id)) duplicateEdges.push(edge.id);
      edgeIDs.add(edge.id);
      if (!nodeIDs.has(edge.source) || !nodeIDs.has(edge.target)) danglingEdges.push(edge.id);
    }

    const hyperedgeMissingNodes: { hyperedge: HyperedgeID; node: NodeID }[] = [];
    for (const hyperedge of this.hyperedges) {
      for (const node of hyperedge.nodes) {
        if (!nodeIDs.has(node)) hyperedgeMissingNodes.push({ hyperedge: hyperedge.id, node });
      }
    }

    return { danglingEdges, duplicateNodes, duplicateEdges, hyperedgeMissingNodes };
  }

  subgraph(ids: Iterable<NodeID>): Kernel {
    const keep = new Set(ids);
    return new Kernel({
      nodes: this.nodes.filter((node) => keep.has(node.id)),
      edges: this.edges.filter((edge) => keep.has(edge.source) && keep.has(edge.target)),
      hyperedges: this.hyperedges.filter((hyperedge) =>
        hyperedge.nodes.every((node) => keep.has(node)),
      ),
      version: this.version,
    });
  }

  filterNodes(predicate: (node: Node) => boolean): Kernel {
    return this.subgraph(this.nodes.filter(predicate).map((node) => node.id));
  }
}
