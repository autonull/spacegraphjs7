import type { GraphFacets } from './types';

/** Facet values with their kept/total display counts. */
export type FacetDisplayCounts = readonly { value: string; kept: number; total: number }[];

/** Applies a partial facet update without dropping filters the caller did not change. */
export const mergeFacets = (current: GraphFacets, next: Partial<GraphFacets>): GraphFacets => ({
    ...current,
    ...next,
});

/** Toggles a value in a facet set, keeping `locked` values selected. */
export const toggleFacet = (values: Iterable<string>, value: string, locked?: string): Set<string> => {
    const next = new Set(values);
    if (next.has(value)) {
        if (value !== locked) next.delete(value);
    } else next.add(value);
    return next;
};

/** Looks up the display count for a facet value. */
export const facetCount = (value: string, counts: FacetDisplayCounts) =>
    counts.find((entry) => entry.value === value);
