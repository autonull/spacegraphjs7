import { diffCollectionById, type CollectionChange, type KeyedCollectionDiff } from './collection-diff';
import type { Edge, Hyperedge, Node } from './kernel';

export type KernelChange<T> = CollectionChange<T>;
export type KernelCollectionDiff<T> = KeyedCollectionDiff<T>;

export type KernelDiff = {
    readonly nodes: KernelCollectionDiff<Node>;
    readonly edges: KernelCollectionDiff<Edge>;
    readonly hyperedges: KernelCollectionDiff<Hyperedge>;
};

const diffByID = <T extends { readonly id: string }>(
    before: readonly T[],
    after: readonly T[],
): KernelCollectionDiff<T> => diffCollectionById(before, after);

export const diffKernels = (
    before: { nodes: readonly Node[]; edges: readonly Edge[]; hyperedges: readonly Hyperedge[] },
    after: { nodes: readonly Node[]; edges: readonly Edge[]; hyperedges: readonly Hyperedge[] },
): KernelDiff => ({
    nodes: diffByID(before.nodes, after.nodes),
    edges: diffByID(before.edges, after.edges),
    hyperedges: diffByID(before.hyperedges, after.hyperedges),
});
