/** Two-run graph diff derived from captured kernel history, never authored as a fixture. */

import { diffKernels, type GraphHistory, type GraphSnapshot } from '@spacegraphjs/kernel';

export type DiffSide = {
    readonly version: number;
    readonly label: string;
    readonly nodes: number;
    readonly edges: number;
};

export type DiffCollection = {
    readonly added: readonly string[];
    readonly removed: readonly string[];
    readonly changed: readonly string[];
};

export type DiffSummary = {
    readonly before: DiffSide;
    readonly after: DiffSide;
    readonly nodes: DiffCollection;
    readonly edges: DiffCollection;
    readonly changedNodes: readonly { id: string; before: string; after: string }[];
};

const side = (snapshot: GraphSnapshot): DiffSide => ({
    version: snapshot.version,
    label: snapshot.label ?? `v${snapshot.version}`,
    nodes: snapshot.kernel.nodes.length,
    edges: snapshot.kernel.edges.length,
});

/** The same diff computation works on any two snapshots, which keeps the view testable in isolation. */
export const diffSnapshots = (before: GraphSnapshot, after: GraphSnapshot): DiffSummary => {
    const diff = diffKernels(before.kernel, after.kernel);
    return {
        before: side(before),
        after: side(after),
        nodes: {
            added: diff.nodes.added.map((node) => node.id),
            removed: diff.nodes.removed.map((node) => node.id),
            changed: diff.nodes.changed.map((change) => change.id),
        },
        edges: {
            added: diff.edges.added.map((edge) => edge.id),
            removed: diff.edges.removed.map((edge) => edge.id),
            changed: diff.edges.changed.map((change) => change.id),
        },
        changedNodes: diff.nodes.changed.map((change) => ({
            id: change.id,
            before: change.before.label,
            after: change.after.label,
        })),
    };
};

export const diffFromHistory = (
    history: Pick<GraphHistory, 'getSnapshot'>,
    beforeVersion: number,
    afterVersion: number,
): DiffSummary => {
    const before = history.getSnapshot(beforeVersion);
    const after = history.getSnapshot(afterVersion);
    if (!before || !after)
        throw new Error(`Missing history snapshots for ${beforeVersion} → ${afterVersion}`);
    return diffSnapshots(before, after);
};
