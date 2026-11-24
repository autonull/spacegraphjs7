import { diffKernels, type Edge, type Hyperedge, type Node } from '@spacegraphjs/kernel';

type KernelLike = {
    readonly nodes: readonly Node[];
    readonly edges: readonly Edge[];
    readonly hyperedges: readonly Hyperedge[];
};

export type Digest = {
    readonly since: number;
    readonly added: readonly string[];
    readonly removed: readonly string[];
    readonly changed: readonly string[];
    readonly edgesAdded: number;
    readonly edgesRemoved: number;
    readonly summary: string;
};

/** One committed-fold delta. Added and removed ids come only from diffKernels. */
export const digestKernels = (before: KernelLike, after: KernelLike, since: number): Digest => {
    const diff = diffKernels(before, after);
    const added = diff.nodes.added.map((node) => node.id);
    const removed = diff.nodes.removed.map((node) => node.id);
    return {
        since,
        added,
        removed,
        changed: diff.nodes.changed.map((change) => change.id),
        edgesAdded: diff.edges.added.length,
        edgesRemoved: diff.edges.removed.length,
        summary: `since ${since}: +${added.length} −${removed.length} facts, ${diff.edges.added.length} new links`,
    };
};
