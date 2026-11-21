import { Kernel, type JsonValue } from './kernel';
import type { KernelOp } from './session';
import type { GraphViewData } from './sub-layout';

/** Adds a node with host-supplied data. Domains emit the same shape regardless of vocabulary. */
export const addNode = (
    id: string,
    kind: string,
    label: string,
    data: Record<string, JsonValue>,
): KernelOp => ({ op: 'add-node', node: { id, kind, label, data } });

/** Adds an edge keyed by its kind and endpoints. */
export const addEdge = (kind: string, source: string, target: string): KernelOp => ({
    op: 'add-edge',
    edge: { id: `${kind}:${source}:${target}`, kind, source, target },
});

/** Minimal shape a domain contributes to the capability manifest. Structurally matches ManifestEntry. */
export interface DomainManifestEntry {
    readonly id: string;
    readonly values: readonly string[];
    readonly source: string;
    readonly capability?: string;
}

/** Optional semantic capabilities a domain may expose. No field is required. */
export interface DomainVocabulary {
    readonly lanes?: readonly string[];
    readonly levels?: readonly string[];
    readonly laneOf?: (node: {
        readonly kind: string;
        readonly data?: Readonly<Record<string, unknown>>;
    }) => string | undefined;
    readonly scopeIdOf?: (node: {
        readonly kind: string;
        readonly data?: Readonly<Record<string, unknown>>;
    }) => string | undefined;
    readonly shapeOf?: (node: {
        readonly kind: string;
        readonly data?: Readonly<Record<string, unknown>>;
    }) => string | undefined;
    readonly statusOf?: (node: {
        readonly kind: string;
        readonly data?: Readonly<Record<string, unknown>>;
        readonly status?: string;
    }) => string | undefined;
    readonly edgesVisibleAt?: (
        edge: { readonly kind: string; readonly data?: Readonly<Record<string, unknown>> },
        level: string,
    ) => boolean;
}

/** A semantic layer over a Kernel. Core owns the Kernel; a domain owns only its meaning. */
export interface DomainModule<M = GraphViewData> {
    readonly id: string;
    readonly manifest: () => readonly DomainManifestEntry[];
    build(kernel: Kernel): M;
    readonly vocabulary: DomainVocabulary;
}

/** Identity helper for type inference. Not a framework. */
export const defineDomain = <M>(module: DomainModule<M>): DomainModule<M> => module;

/** Folds ops into a Kernel, preserving existing entries and advancing the version once per op. */
export const foldKernelOps = (ops: Iterable<KernelOp>, into = new Kernel()): Kernel => {
    const nodes = new Map(into.nodes.map((node) => [node.id, node]));
    const edges = new Map(into.edges.map((edge) => [edge.id, edge]));
    const hyperedges = new Map(into.hyperedges.map((hyperedge) => [hyperedge.id, hyperedge]));
    let version = into.version;

    for (const op of ops) {
        version++;
        switch (op.op) {
            case 'add-node':
                nodes.set(op.node.id, op.node);
                break;
            case 'remove-node':
                nodes.delete(op.id);
                break;
            case 'add-edge':
                edges.set(op.edge.id, op.edge);
                break;
            case 'remove-edge':
                edges.delete(op.id);
                break;
            case 'add-hyperedge':
                hyperedges.set(op.hyperedge.id, op.hyperedge);
                break;
            case 'remove-hyperedge':
                hyperedges.delete(op.id);
                break;
        }
    }

    return new Kernel({
        nodes: [...nodes.values()],
        edges: [...edges.values()],
        hyperedges: [...hyperedges.values()],
        version,
    });
};
