import type { GraphViewData, GraphNode, GraphFacets, FacetCounts } from '@spacegraphjs/shared';

export type { GraphFacets, FacetCounts };

/** Accessors the host provides to extract facet values from nodes. */
export interface FacetAccessors {
    /** Extract the kind from a node. */
    kind: (node: GraphNode) => string;
    /** Extract the status from a node. */
    status: (node: GraphNode) => string;
    /** Extract the domain from a node, or undefined if not applicable. */
    domain?: (node: GraphNode) => string | undefined;
    /** Get the root node ID. */
    rootId: (model: GraphViewData) => string;
}

/** Options for applying facets. */
export interface ApplyFacetsOptions {
    /** The graph model. */
    model: GraphViewData;
    /** The facets to apply. */
    facets: GraphFacets;
    /** Host-provided accessors. */
    accessors: FacetAccessors;
}

/** Options for keeping only specific node IDs. */
export interface KeepOnlyOptions {
    /** The graph model. */
    model: GraphViewData;
    /** The node IDs to keep. */
    ids: Iterable<string>;
    /** Host-provided accessors (only rootId needed). */
    accessors: Pick<FacetAccessors, 'rootId'>;
}

/** Options for composing scopes. */
export interface ComposeScopesOptions {
    /** The graph model. */
    model: GraphViewData;
    /** The facets to apply. */
    facets: GraphFacets;
    /** Optional set of node IDs to keep (from "keep only" scope). */
    keptIds: ReadonlySet<string> | null;
    /** Set of collapsed group IDs. */
    collapsedGroups: ReadonlySet<string>;
    /** Host-provided accessors. */
    accessors: FacetAccessors;
    /** Function to collapse groups (from kernel). */
    collapseGroups: (model: GraphViewData, collapsed: ReadonlySet<string>) => GraphViewData;
}

/**
 * Check if a node matches the text query.
 * Uses the default search text extraction if no custom one provided.
 */
function matchQuery(node: GraphNode, query: string, searchText?: (node: GraphNode) => string[]): boolean {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    const texts = searchText ? searchText(node) : defaultSearchText(node);
    return texts.join('\n').toLowerCase().includes(needle);
}

/** Default search text extractor (can be overridden by host). */
function defaultSearchText(node: GraphNode): string[] {
    return [
        node.label,
        node.summary,
        node.data?.name as string | undefined,
        node.data?.path as string | undefined,
        node.data?.command as string | undefined,
        node.data?.input ? JSON.stringify(node.data.input) : undefined,
    ].filter((value): value is string => !!value);
}

/**
 * Apply facets to a model, returning a filtered model.
 * The domain facet scopes the model first; kind/status/query filter the scoped nodes.
 * The session root always stays so the answer keeps an address.
 */
export function applyFacets({ model, facets, accessors }: ApplyFacetsOptions): GraphViewData {
    const { query, kinds, statuses, domains } = facets;

    // Domain scoping first
    let scopedNodes = model.nodes;
    if (domains.size > 0 && accessors.domain) {
        scopedNodes = scopedNodes.filter((node) => {
            const nodeDomain = accessors.domain?.(node);
            return !nodeDomain || domains.has(nodeDomain);
        });
    }

    // Then filter by kind, status, and query
    const kept = new Set<string>();
    for (const node of scopedNodes) {
        const kindMatch = kinds.size === 0 || kinds.has(accessors.kind(node));
        const statusMatch = statuses.size === 0 || statuses.has(accessors.status(node));
        const queryMatch = matchQuery(node, query);

        if (node.id === accessors.rootId(model) || (kindMatch && statusMatch && queryMatch)) {
            kept.add(node.id);
        }
    }

    // Always keep the root
    kept.add(accessors.rootId(model));

    return {
        ...model,
        nodes: model.nodes.filter((node) => kept.has(node.id)),
        edges: model.edges.filter((edge) => kept.has(edge.source) && kept.has(edge.target)),
        turns: model.turns?.filter((turn) => kept.has(turn)) ?? [],
        activeTurn:
            model.activeTurn !== undefined && kept.has(model.activeTurn) ? model.activeTurn : undefined,
    };
}

/**
 * Keep only the specified node IDs (and the root).
 * Applied after facets so the two compose.
 */
export function keepOnly({ model, ids, accessors }: KeepOnlyOptions): GraphViewData {
    const kept = new Set(ids);
    kept.add(accessors.rootId(model));

    return {
        ...model,
        nodes: model.nodes.filter((node) => kept.has(node.id)),
        edges: model.edges.filter((edge) => kept.has(edge.source) && kept.has(edge.target)),
        turns: model.turns?.filter((turn) => kept.has(turn)) ?? [],
        activeTurn:
            model.activeTurn !== undefined && kept.has(model.activeTurn) ? model.activeTurn : undefined,
    };
}

/**
 * Compose the scope pipeline: facets → keepOnly → collapseGroups.
 * This is the single scope pipeline used by the host.
 */
export function composeScopes({
    model,
    facets,
    keptIds,
    collapsedGroups,
    accessors,
    collapseGroups,
}: ComposeScopesOptions): GraphViewData {
    let result = applyFacets({ model, facets, accessors });

    if (keptIds) result = keepOnly({ model: result, ids: keptIds, accessors });

    if (collapsedGroups.size > 0) result = collapseGroups(result, collapsedGroups);

    return result;
}

/**
 * Compute facet counts for display in filter UI.
 * Returns counts of kept vs total for each facet value.
 * Each facet's own group is excluded from its count so a chip says what it adds.
 */
export function facetCounts(
    model: GraphViewData,
    facets: GraphFacets,
    accessors: FacetAccessors,
    knownKinds: readonly string[],
    knownStatuses: readonly string[],
    knownDomains: readonly string[],
): FacetCounts {
    const scoped = applyFacets({ model, facets, accessors });
    const keptIds = new Set(scoped.nodes.map((n) => n.id));

    const countGroup = <T extends string>(
        nodes: readonly GraphNode[],
        values: readonly T[],
        valueOf: (node: GraphNode) => T | undefined,
        facets: GraphFacets,
        withoutFacet: (facets: GraphFacets) => GraphFacets,
    ) => {
        const other = withoutFacet(facets);
        return values.map((value) => {
            const members = nodes.filter((node) => valueOf(node) === value);
            return {
                value,
                total: members.length,
                kept: members.filter((node) => keptIds.has(node.id) && matchesFacets(node, other, accessors)).length,
            };
        });
    };

    const withoutKind = (current: GraphFacets): GraphFacets => ({ ...current, kinds: new Set<string>() });
    const withoutStatus = (current: GraphFacets): GraphFacets => ({ ...current, statuses: new Set<string>() });
    const withoutDomain = (current: GraphFacets): GraphFacets => ({ ...current, domains: new Set(knownDomains) });

    return {
        kinds: countGroup(model.nodes, knownKinds, (node) => accessors.kind(node) as any, facets, withoutKind),
        statuses: countGroup(model.nodes, knownStatuses, (node) => accessors.status(node) as any, facets, withoutStatus),
        domains: countGroup(
            model.nodes,
            knownDomains,
            (node) => accessors.domain?.(node) as any,
            facets,
            withoutDomain,
        ),
    };
}

function matchesFacets(node: GraphNode, facets: GraphFacets, accessors: FacetAccessors): boolean {
    const { query, kinds, statuses } = facets;
    const kindMatch = kinds.size === 0 || kinds.has(accessors.kind(node));
    const statusMatch = statuses.size === 0 || statuses.has(accessors.status(node));
    const queryMatch = matchQuery(node, query);
    return kindMatch && statusMatch && queryMatch;
}

/**
 * Serialize facets into the `q=` grammar: free text plus `kind:`/`status:`/`domain:` tokens.
 * Uses canonical ordering of known values.
 */
export function facetsToQuery(
    facets: GraphFacets,
    knownKinds: readonly string[],
    knownStatuses: readonly string[],
    knownDomains: readonly string[],
): string {
    const ordered = <T extends string>(values: Iterable<T>, order: readonly T[]) => {
        const set = new Set(values);
        return order.filter((value) => set.has(value));
    };

    const encode = (name: string, values: Iterable<string>) => {
        const list = [...values];
        return list.length > 0 ? `${name}:${list.join(',')}` : undefined;
    };

    const values = [
        facets.query.trim(),
        encode('kind', ordered(facets.kinds, knownKinds)),
        encode('status', ordered(facets.statuses, knownStatuses)),
        encode('domain', ordered(facets.domains, knownDomains)),
    ].filter((value): value is string => !!value);

    return values.join(' ');
}

/**
 * Parse the `q=` grammar back into facets.
 * Unknown values are ignored; order is canonical.
 * Empty query returns default facets with domain:session.
 */
export function facetsFromQuery(
    query: string,
    knownKinds: readonly string[],
    knownStatuses: readonly string[],
    knownDomains: readonly string[],
): GraphFacets {
    const text: string[] = [];
    const kinds = new Set<string>();
    const statuses = new Set<string>();
    const domains = new Set<string>(['session']); // Default domain

    const kindSet = new Set(knownKinds);
    const statusSet = new Set(knownStatuses);
    const domainSet = new Set(knownDomains);

    const trimmed = query.trim();
    if (!trimmed) {
        return { query: '', kinds, statuses, domains };
    }

    for (const token of trimmed.split(/\s+/)) {
        if (!token) continue;
        const separator = token.indexOf(':');
        if (separator <= 0) {
            text.push(token);
            continue;
        }
        const name = token.slice(0, separator);
        const values = token.slice(separator + 1).split(',').filter(Boolean);
        if (name === 'kind') {
            for (const value of values) if (kindSet.has(value)) kinds.add(value);
            continue;
        }
        if (name === 'status') {
            for (const value of values) if (statusSet.has(value)) statuses.add(value);
            continue;
        }
        if (name === 'domain') {
            for (const value of values) if (domainSet.has(value)) domains.add(value);
            continue;
        }
        text.push(token);
    }

    return { query: text.join(' '), kinds, statuses, domains };
}

/** Check if facets have any active filter (non-empty query, kinds, or statuses). */
export function hasFacets(facets: GraphFacets): boolean {
    return facets.query.trim().length > 0 || facets.kinds.size > 0 || facets.statuses.size > 0;
}