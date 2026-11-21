/** Vocabulary-free helpers shared by the domain packages. */

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

export const dataString = (
    node: { readonly data?: Readonly<Record<string, unknown>> },
    key: string,
): string | undefined => text(node.data?.[key]);

/** Binds a domain's default kind→role table. Host tag first, then table, then open-ended kind. */
export const createRoleReader =
    (tags: Readonly<Record<string, string | undefined>>) =>
    (node: {
        readonly kind: string;
        readonly data?: Readonly<Record<string, unknown>>;
    }): string =>
        dataString(node, 'role') ?? tags[node.kind] ?? node.kind;

/** An edge's advisory relation: host tag first, then its open-ended kind. */
export const relationOf = (edge: {
    readonly kind: string;
    readonly data?: Readonly<Record<string, unknown>>;
}): string => dataString(edge, 'relation') ?? edge.kind;

/** Facet role tag reads `data.role`, then `data.kind` (not `node.kind`). */
export const facetRoleOf = (
    node: { readonly data?: Readonly<Record<string, unknown>> },
): string | undefined => dataString(node, 'role') ?? dataString(node, 'kind');

export type ViewNodeSource = {
    readonly id: string;
    readonly kind: string;
    readonly label: string;
    readonly data?: Readonly<Record<string, unknown>>;
};

export type ViewEdgeSource = {
    readonly id: string;
    readonly source: string;
    readonly target: string;
    readonly kind: string;
    readonly data?: Readonly<Record<string, unknown>>;
};

export type ViewNode = {
    id: string;
    kind: string;
    label: string;
    summary: string | undefined;
    status: string;
    data: Record<string, unknown>;
};

export type ViewEdge = {
    id: string;
    source: string;
    target: string;
    kind: string;
    confidence: 'explicit' | 'structural';
    data: Record<string, unknown>;
};

export const mapViewNodes = (nodes: readonly ViewNodeSource[]): ViewNode[] =>
    nodes.map((node) => ({
        id: node.id,
        kind: node.kind,
        label: node.label,
        summary: dataString(node, 'summary'),
        status:
            dataString(node, 'status') ??
            (node.data?.isError === true ? 'failed' : 'complete'),
        data: { ...node.data },
    }));

export const mapViewEdges = (edges: readonly ViewEdgeSource[]): ViewEdge[] =>
    edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        kind: edge.kind,
        confidence:
            edge.data?.confidence === 'structural' ? ('structural' as const) : ('explicit' as const),
        data: { ...edge.data },
    }));

export type Trace = {
    readonly answerIds: ReadonlySet<string>;
    readonly contextIds: ReadonlySet<string>;
    readonly answerEdgeIds: ReadonlySet<string>;
};

/** BFS over allowed edge kinds; context comes from `contains` parents of each reached node. */
export const walk = (
    view: { readonly edges: readonly ViewEdgeSource[] },
    start: string,
    direction: 'in' | 'out',
    kinds: readonly string[],
): Trace => {
    const allowed = new Set(kinds);
    const answerIds = new Set<string>();
    const contextIds = new Set<string>();
    const answerEdgeIds = new Set<string>();
    const seen = new Set<string>([start]);
    let frontier = [start];

    while (frontier.length) {
        const next: string[] = [];
        for (const edge of view.edges) {
            if (!allowed.has(edge.kind)) continue;
            const from = direction === 'out' ? edge.source : edge.target;
            const to = direction === 'out' ? edge.target : edge.source;
            if (!frontier.includes(from) || seen.has(to)) continue;
            answerIds.add(to);
            answerEdgeIds.add(edge.id);
            for (const parent of view.edges) {
                if (parent.target === to && parent.kind === 'contains')
                    contextIds.add(parent.source);
            }
            seen.add(to);
            next.push(to);
        }
        frontier = next;
    }

    return { answerIds, contextIds, answerEdgeIds };
};

export type TraceSelectorName = 'why' | 'ledHere' | 'downstream' | 'upstream' | 'related';

/** Binds a domain's edge-kind table to the five trace selectors. */
export const createTraceSelectors = <View extends { readonly edges: readonly ViewEdgeSource[] }>(
    kinds: Readonly<Record<string, readonly string[]>>,
): Record<TraceSelectorName, (view: View, id: string) => Trace> => ({
    why: (view, id) => walk(view, id, 'in', kinds.why ?? []),
    ledHere: (view, id) => walk(view, id, 'out', kinds['led-here'] ?? []),
    downstream: (view, id) => walk(view, id, 'out', kinds.downstream ?? []),
    upstream: (view, id) => walk(view, id, 'in', kinds.upstream ?? []),
    related: (view, id) => walk(view, id, 'in', kinds.related ?? []),
});
