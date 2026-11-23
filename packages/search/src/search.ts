import type { GraphViewData, GraphNode, GraphFacets, FacetCounts } from '@spacegraphjs/shared';
import { defaultFacetAccessors, facetCounts as facetCountsWithAccessors } from './facets';
import { defaultSearchText } from './search-text';

export { defaultSearchText } from './search-text';
export type { SearchTextFn } from './search-text';

/** Search function signature for custom ranking. */
export type SearchFn = (model: GraphViewData, query: string) => GraphNode[];

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
 * @deprecated Use `facetCounts` from `@spacegraphjs/search` with accessors and known value lists.
 */
export function facetCounts(model: GraphViewData, facets: GraphFacets): FacetCounts {
    return facetCountsWithAccessors(
        model,
        { ...facets, query: facets.query ?? '' },
        defaultFacetAccessors,
        Array.from(facets.kinds),
        Array.from(facets.statuses),
        Array.from(facets.domains),
    );
}
