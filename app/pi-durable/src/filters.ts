import { tally } from './instruments';

export type MuteFilter = {
    readonly kinds: readonly string[];
    readonly statuses: readonly string[];
};

export const matchesFilter = (
    node: { readonly kind: string; readonly status: string },
    filter: MuteFilter,
): boolean =>
    (!filter.kinds.length || filter.kinds.includes(node.kind))
    && (!filter.statuses.length || filter.statuses.includes(node.status));

export const filterCounts = (
    nodes: readonly { readonly kind: string; readonly status: string }[],
    filter: MuteFilter,
) => ({
    total: nodes.length,
    matching: nodes.filter((node) => matchesFilter(node, filter)).length,
    kinds: tally(nodes.map((node) => node.kind)),
    statuses: tally(nodes.map((node) => node.status)),
});
