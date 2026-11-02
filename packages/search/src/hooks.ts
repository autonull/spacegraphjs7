import { createSignal, createMemo } from 'solid-js';
import type { GraphViewData, GraphNode, GraphFacets } from '@spacegraphjs/shared';
import {
    rankedSearch,
    sessionOutline,
    facetCounts,
    type SearchFn,
    type SearchTextFn,
    defaultRank,
    defaultSearchText,
} from './search';
import { navigationHelp } from './navigation';

export interface UseSearchOptions {
    model: GraphViewData;
    initialQuery?: string;
    searchFn?: SearchFn;
    searchTextFn?: SearchTextFn;
}

export interface UseSearchReturn {
    query: string;
    setQuery: (query: string) => void;
    results: GraphNode[];
    activeIndex: number;
    setActiveIndex: (index: number) => void;
    navigationHint: { key: string; labelKey: string }[];
}

/**
 * Headless hook for search functionality.
 * Returns state and helpers for building custom search UI.
 */
export function useSearch({
    model,
    initialQuery = '',
    searchFn = (m, q) => rankedSearch(m, q),
    searchTextFn = defaultSearchText,
}: UseSearchOptions): UseSearchReturn {
    const [query, setQuery] = createSignal(initialQuery);
    const [activeIndex, setActiveIndex] = createSignal(0);

    const results = createMemo(() => {
        const q = query().trim();
        if (!q) return [];
        return searchFn(model, q);
    });

    const navigationHint = createMemo(() =>
        query().trim().toLowerCase() === 'g' ? navigationHelp() : [],
    );

    return {
        get query() {
            return query();
        },
        setQuery,
        get results() {
            return results();
        },
        get activeIndex() {
            return activeIndex();
        },
        setActiveIndex,
        get navigationHint() {
            return navigationHint();
        },
    };
}

export interface UseFindOptions {
    model: GraphViewData;
    facets: GraphFacets;
    onFacetsChange: (facets: GraphFacets) => void;
    initialTab?: 'search' | 'filters' | 'outline';
}

export interface UseFindReturn {
    query: string;
    setQuery: (query: string) => void;
    activeIndex: number;
    setActiveIndex: (index: number) => void;
    activeTab: 'search' | 'filters' | 'outline';
    setActiveTab: (tab: 'search' | 'filters' | 'outline') => void;
    searchResults: GraphNode[];
    outline: ReturnType<typeof sessionOutline>;
    counts: ReturnType<typeof facetCounts>;
}

/**
 * Headless hook for the unified Find panel (search + filters + outline).
 */
export function useFind({
    model,
    facets,
    onFacetsChange,
    initialTab = 'search',
}: UseFindOptions): UseFindReturn {
    const [query, setQuery] = createSignal('');
    const [activeIndex, setActiveIndex] = createSignal(0);
    const [activeTab, setActiveTab] = createSignal<'search' | 'filters' | 'outline'>(initialTab);

    const searchResults = createMemo(() => {
        const q = query().trim();
        if (!q) return [];
        return rankedSearch(model, q);
    });

    const outline = createMemo(() => sessionOutline(model));
    const counts = createMemo(() => facetCounts(model, facets));

    return {
        get query() {
            return query();
        },
        setQuery,
        get activeIndex() {
            return activeIndex();
        },
        setActiveIndex,
        get activeTab() {
            return activeTab();
        },
        setActiveTab,
        get searchResults() {
            return searchResults();
        },
        get outline() {
            return outline();
        },
        get counts() {
            return counts();
        },
    };
}
