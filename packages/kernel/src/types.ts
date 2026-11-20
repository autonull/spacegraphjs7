/**
 * Core graph types for the kernel.
 * These are the minimal types needed for kernel operations.
 */


/** Graph node - generic version. */
export interface GraphNode {
    id: string;
    label: string;
    kind: string;
    status: string;
    summary?: string;
    provenance?: {
        source: string;
        asOf?: number;
    };
    data?: Record<string, unknown>;
    interactive?: boolean;
    /** Optional cluster/group membership. If present, this node is a group containing these member IDs. */
    clusterOf?: readonly string[];
}

/** Graph edge - generic version. */
export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    kind: string;
    confidence?: 'explicit' | 'structural' | 'inferred';
    label?: string;
    data?: Record<string, unknown>;
}

/** Graph view data - generic version. */
export interface GraphViewData {
    nodes: readonly GraphNode[];
    edges: readonly GraphEdge[];
    turns?: readonly string[];
    workspaceRoot?: string;
    /** The active turn node ID, when the session still owns work. */
    activeTurn?: string;
}

/** Graph facets for filtering. */
export interface GraphFacets {
    query: string;
    kinds: ReadonlySet<string>;
    statuses: ReadonlySet<string>;
    domains: ReadonlySet<string>;
}

/** Facet counts for display. */
export interface FacetCounts {
    kinds: readonly { value: string; kept: number; total: number }[];
    statuses: readonly { value: string; kept: number; total: number }[];
    domains: readonly { value: string; kept: number; total: number }[];
}