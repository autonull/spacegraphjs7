import type { GraphViewData, GraphNode, GraphFacets, FacetCounts } from '@spacegraphjs/shared';

/** Search function signature for custom ranking. */
export type SearchFn = (model: GraphViewData, query: string) => GraphNode[];

/** Default search text extractor - can be customized by host. */
export type SearchTextFn = (node: GraphNode) => string[];

/**
 * Generic search that delegates to a search function.
 * The host provides the search function (e.g., rankedSearch) and search text extractor.
 */
export function search(model: GraphViewData, query: string, searchFn: SearchFn): GraphNode[] {
    return searchFn(model, query);
}

/**
 * Ranked search using a custom rank function.
 * The rank function returns a score (lower = better match), or -1 for no match.
 * Results are sorted by score, then by model order (stable sort).
 */
export function searchBy(
    model: GraphViewData,
    query: string,
    rank: (node: GraphNode, needle: string) => number,
): GraphNode[] {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    const results: Array<{ node: GraphNode; score: number; index: number }> = [];

    model.nodes.forEach((node, index) => {
        const score = rank(node, needle);
        if (score >= 0) {
            results.push({ node, score, index });
        }
    });

    results.sort((a, b) => a.score - b.score || a.index - b.index);

    return results.map(({ node }) => node);
}

/**
 * Default search text extractor.
 * Extracts searchable text from a node: label, summary, and data fields.
 */
export const defaultSearchText: SearchTextFn = (node: GraphNode) =>
    [
        node.label,
        node.summary,
        node.data?.name as string | undefined,
        node.data?.path as string | undefined,
        node.data?.command as string | undefined,
        node.data?.input ? JSON.stringify(node.data.input) : undefined,
    ].filter((value): value is string => !!value);

/**
 * Default rank function for session-like graphs.
 * Priority: label prefix > label contains > name contains > path contains > body contains
 */
export const defaultRank = (node: GraphNode, needle: string): number => {
    const label = node.label.toLowerCase();
    if (label.startsWith(needle)) return 0;
    if (label.includes(needle)) return 1;

    const name = (node.data?.name as string | undefined)?.toLowerCase();
    if (name?.includes(needle)) return 2;

    const path = (node.data?.path as string | undefined)?.toLowerCase();
    if (path?.includes(needle)) return 3;

    return defaultSearchText(node).join('\n').toLowerCase().includes(needle) ? 4 : -1;
};

/**
 * Ranked search using the default rank function.
 * Convenience function that combines searchBy with defaultRank.
 */
export function rankedSearch(model: GraphViewData, query: string): GraphNode[] {
    return searchBy(model, query, defaultRank);
}

/**
 * Session outline: turns with their phases, for the Unified Find panel.
 * Returns turns in session order with their phase children.
 */
export interface OutlineTurn {
    turnID: string;
    turnLabel: string;
    phases: Array<{ id: string; category: string; label: string }>;
}

export function sessionOutline(model: GraphViewData): OutlineTurn[] {
    if (!model.turns || model.turns.length === 0) return [];

    const turnNumbers = new Map(model.turns.map((id, index) => [id, index + 1]));
    const turnMap = new Map(model.turns.map((id) => [id, model.nodes.find((n) => n.id === id)]));
    const children = new Map<string, string[]>();

    for (const edge of model.edges) {
        if (edge.kind === 'part-of') {
            const list = children.get(edge.source) ?? [];
            list.push(edge.target);
            children.set(edge.source, list);
        }
    }

    return model.turns.map((turnID) => {
        const turnNode = turnMap.get(turnID);
        const turnLabel = turnNode?.label ?? `Turn ${turnNumbers.get(turnID)}`;
        const turnChildren = children.get(turnID) ?? [];
        const phases = turnChildren
            .map((id) => model.nodes.find((n) => n.id === id))
            .filter((node): node is GraphNode => !!node && node.kind === 'phase')
            .map((phase) => ({
                id: phase.id,
                category: (phase.data?.category as string) ?? 'unknown',
                label: phase.label,
            }));

        return { turnID, turnLabel, phases };
    });
}

/**
 * Computes facet counts for display in filter UI.
 * Returns counts of kept vs total for each facet value.
 */
export function facetCounts(model: GraphViewData, facets: GraphFacets): FacetCounts {
    const kept = new Set<string>();

    for (const node of model.nodes) {
        const kindMatch = facets.kinds.size === 0 || facets.kinds.has(node.kind);
        const statusMatch = facets.statuses.size === 0 || facets.statuses.has(node.status);
        const domainMatch =
            facets.domains.size === 0 ||
            (node.data?.domain ? facets.domains.has(node.data.domain as string) : false);

        if (kindMatch && statusMatch && domainMatch) {
            kept.add(node.id);
        }
    }

    const countValues = (
        values: readonly string[],
        getValue: (node: GraphNode) => string | undefined,
    ) => {
        const totals = new Map<string, number>();
        const keptCounts = new Map<string, number>();

        for (const node of model.nodes) {
            const value = getValue(node);
            if (!value) continue;
            totals.set(value, (totals.get(value) ?? 0) + 1);
            if (kept.has(node.id)) keptCounts.set(value, (keptCounts.get(value) ?? 0) + 1);
        }

        return values.map((value) => ({
            value,
            kept: keptCounts.get(value) ?? 0,
            total: totals.get(value) ?? 0,
        }));
    };

    return {
        kinds: countValues(Array.from(facets.kinds), (n) => n.kind),
        statuses: countValues(Array.from(facets.statuses), (n) => n.status),
        domains: countValues(
            Array.from(facets.domains),
            (n) => n.data?.domain as string | undefined,
        ),
    };
}
