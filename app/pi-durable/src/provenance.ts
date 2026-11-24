import { tabKernel, type Tab } from 'pi-kit';

export type Provenance = {
    readonly id: string;
    readonly sequence: number;
    readonly source: string;
    readonly at?: number;
    readonly predecessor?: string;
    readonly successor?: string;
    readonly facets: readonly string[];
    readonly edgeKinds: readonly string[];
};

const stringOf = (value: unknown): string | undefined =>
    typeof value === 'string' && value ? value : undefined;

/** Provenance reads the folded kernel and its entry log; it invents no cause or edge. */
export const provenanceFor = (tab: Tab, id: string): Provenance | undefined => {
    const kernel = tabKernel(tab);
    const node = kernel.nodes.find((candidate) => candidate.id === id);
    if (!node) return undefined;
    const index = tab.session.entries.findIndex((entry) =>
        entry.op.op === 'add-node' && entry.op.node.id === id);
    const entry = index >= 0 ? tab.session.entries[index] : undefined;
    const incoming = kernel.edges.filter((edge) => edge.target === id);
    const outgoing = kernel.edges.filter((edge) => edge.source === id);
    const predecessor = incoming.find((edge) => edge.kind === 'orders')?.source
        ?? incoming.find((edge) => edge.kind === 'forkedFrom')?.source;
    const successor = outgoing.find((edge) => edge.kind === 'orders')?.target;
    const facets = [stringOf(node.data?.['lane']), stringOf(node.data?.['role']), node.kind]
        .filter((value): value is string => Boolean(value));
    return {
        id,
        sequence: index + 1,
        source: entry?.id ?? `node:${id}`,
        ...(typeof entry?.at === 'number' ? { at: entry.at } : {}),
        ...(predecessor ? { predecessor } : {}),
        ...(successor ? { successor } : {}),
        facets: [...new Set(facets)],
        edgeKinds: [...new Set([...incoming, ...outgoing].map((edge) => edge.kind))],
    };
};
