import { Kernel } from './kernel';
import type {
  Edge,
  EdgeID,
  Hyperedge,
  HyperedgeID,
  KernelBuilder,
  Node,
  NodeID,
} from './kernel';

export type KernelOp =
  | { readonly op: 'add-node'; readonly node: Node }
  | { readonly op: 'remove-node'; readonly id: NodeID }
  | { readonly op: 'add-edge'; readonly edge: Edge }
  | { readonly op: 'remove-edge'; readonly id: EdgeID }
  | { readonly op: 'add-hyperedge'; readonly hyperedge: Hyperedge }
  | { readonly op: 'remove-hyperedge'; readonly id: HyperedgeID };

export type SessionEntry = {
  readonly id: string;
  readonly op: KernelOp;
  readonly at?: number;
};

export type SessionKernelShape = {
  readonly entries: readonly SessionEntry[];
  readonly version?: number;
  readonly tags?: Readonly<Record<string, number>>;
  readonly forkedFrom?: number;
};

const fold = (entries: readonly SessionEntry[], version: number): Kernel => {
  const builder: KernelBuilder = {
    nodes: new Map(),
    edges: new Map(),
    hyperedges: new Map(),
  };
  for (const entry of entries) {
    const op = entry.op;
    switch (op.op) {
      case 'add-node':
        builder.nodes.set(op.node.id, op.node);
        break;
      case 'remove-node':
        builder.nodes.delete(op.id);
        break;
      case 'add-edge':
        builder.edges.set(op.edge.id, op.edge);
        break;
      case 'remove-edge':
        builder.edges.delete(op.id);
        break;
      case 'add-hyperedge':
        builder.hyperedges.set(op.hyperedge.id, op.hyperedge);
        break;
      case 'remove-hyperedge':
        builder.hyperedges.delete(op.id);
        break;
    }
  }
  return new Kernel({
    nodes: [...builder.nodes.values()],
    edges: [...builder.edges.values()],
    hyperedges: [...builder.hyperedges.values()],
    version,
  });
};

export type SessionCheckpoint = {
  readonly state: Kernel
  readonly version: number
}

export class SessionKernel {
  readonly entries: readonly SessionEntry[];
  readonly version: number;
  readonly tags: ReadonlyMap<string, number>;
  readonly forkedFrom?: number;
  private cachedState?: Kernel;

  constructor(shape: SessionKernelShape = { entries: [] }) {
    this.entries = [...shape.entries];
    this.version = shape.version ?? this.entries.length;
    this.tags = new Map(Object.entries(shape.tags ?? {}));
    this.forkedFrom = shape.forkedFrom;
  }

  append(entry: SessionEntry): SessionKernel {
    return new SessionKernel({
      entries: [...this.entries, entry],
      version: this.version + 1,
      tags: Object.fromEntries(this.tags),
      forkedFrom: this.forkedFrom,
    });
  }

  state(): Kernel {
    this.cachedState ??= fold(this.entries, this.version);
    return this.cachedState;
  }

  checkpoint(): SessionCheckpoint {
    return { state: this.state(), version: this.version };
  }

  tag(name: string): SessionKernel {
    const tags = new Map(this.tags);
    tags.set(name, this.version);
    return new SessionKernel({
      entries: this.entries,
      version: this.version,
      tags: Object.fromEntries(tags),
      forkedFrom: this.forkedFrom,
    });
  }

  checkout(version: number): SessionKernel {
    return this.slice(version);
  }

  fork(version: number): SessionKernel {
    return this.slice(version, version);
  }

  private slice(version: number, forkedFrom?: number): SessionKernel {
    if (version < 0 || version > this.version) {
      throw new Error(`Session version ${version} is outside 0..${this.version}`);
    }
    const tags = Object.fromEntries([...this.tags].filter(([, at]) => at <= version));
    return new SessionKernel({
      entries: this.entries.slice(0, version),
      version,
      tags,
      forkedFrom: forkedFrom ?? this.forkedFrom,
    });
  }
}
