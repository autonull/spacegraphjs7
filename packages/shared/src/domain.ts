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

/** Builds the identity kind→role table from a domain's role list. */
export const createRoleTags = <Role extends string>(
    roles: readonly Role[],
): Readonly<Record<string, Role>> =>
    Object.fromEntries(roles.map((role) => [role, role])) as Readonly<Record<string, Role>>;

/** The three rungs every domain vocabulary exposes. */
export const DOMAIN_LEVELS = ['overview', 'execution', 'detail'] as const;

type VocabularyNode = {
    readonly kind: string;
    readonly status?: string;
    readonly data?: Readonly<Record<string, unknown>>;
};

/** Level ladder and default shape/status readers shared by all domain vocabularies. */
export const commonVocabulary = (roleOf: (node: VocabularyNode) => string) => ({
    levels: DOMAIN_LEVELS,
    shapeOf: (node: VocabularyNode) => roleOf(node),
    statusOf: (node: VocabularyNode) => node.status ?? dataString(node, 'status'),
});

/** An edge's advisory relation: host tag first, then its open-ended kind. */
export const relationOf = (edge: {
    readonly kind: string;
    readonly data?: Readonly<Record<string, unknown>>;
}): string => dataString(edge, 'relation') ?? edge.kind;

type GroupableNode = {
    readonly id: string;
    readonly kind: string;
    readonly label?: string;
    readonly data?: Readonly<Record<string, unknown>>;
};

type GroupableEdge = {
    readonly source: string;
    readonly target: string;
    readonly kind: string;
    readonly data?: Readonly<Record<string, unknown>>;
};

export type EdgeTargetGroup = {
    id: string;
    path: string;
    writers: string[];
    readers: string[];
};

/** Edges grouped by target in first-write order, with the sources that write and read each target. */
export const groupEdgesByTarget = (
    nodes: readonly GroupableNode[],
    edges: readonly GroupableEdge[],
    options: {
        isTarget: (node: GroupableNode) => boolean;
        writes: Iterable<string>;
        reads?: Iterable<string>;
    },
): EdgeTargetGroup[] => {
    const byID = new Map(nodes.map((node) => [node.id, node]));
    const writes = new Set(options.writes);
    const reads = new Set(options.reads ?? []);
    const groups = new Map<string, EdgeTargetGroup>();
    const order: string[] = [];

    for (const edge of edges) {
        const node = byID.get(edge.target);
        if (!node || !options.isTarget(node) || !writes.has(relationOf(edge))) continue;
        let group = groups.get(edge.target);
        if (!group) {
            group = {
                id: edge.target,
                path: dataString(node, 'path') ?? (node.label as string),
                writers: [],
                readers: [],
            };
            groups.set(edge.target, group);
            order.push(edge.target);
        }
        group.writers.push(edge.source);
    }
    for (const edge of edges) {
        if (!groups.has(edge.target) || !reads.has(relationOf(edge))) continue;
        groups.get(edge.target)!.readers.push(edge.source);
    }
    return order.map((id) => groups.get(id)!);
};

/** Facet role tag reads `data.role`, then `data.kind` (not `node.kind`). */
export const facetRoleOf = (
    node: { readonly data?: Readonly<Record<string, unknown>> },
): string | undefined => dataString(node, 'role') ?? dataString(node, 'kind');

/** The vocabulary-specific parts of a domain's facet and trace contract. */
export type DomainFacetSpec = {
    readonly rootKind: string;
    readonly failedToolKind: string;
    readonly fileWriteKind: string;
    readonly fileWriteDataKey: string;
    readonly subagentRole: string;
    readonly subagentKind?: string;
    readonly edgeKinds: {
        readonly provenance: readonly string[];
        readonly read: readonly string[];
        readonly downstream: readonly string[];
    };
};

type FacetNode = {
    readonly kind: string;
    readonly status?: string;
    readonly data?: Readonly<Record<string, unknown>>;
};

/** Builds the generic accessors and vocabulary sets a domain plugs into search and trace. */
export const createDomainFacets = (spec: DomainFacetSpec) => ({
    accessors: {
        kind: (node: FacetNode): string => node.kind,
        status: (node: FacetNode): string => node.status ?? '',
        rootId: (model: { readonly nodes: readonly { readonly id: string; readonly kind: string }[] }): string =>
            model.nodes.find((node) => node.kind === spec.rootKind)?.id ?? model.nodes[0]?.id ?? '',
        isFailedTool: (node: FacetNode): boolean =>
            node.kind === spec.failedToolKind && node.status === 'failed',
        isFileWrite: (node: FacetNode): boolean =>
            node.kind === spec.fileWriteKind && typeof node.data?.[spec.fileWriteDataKey] === 'string',
        isSubagentCall: (node: FacetNode): boolean =>
            (spec.subagentKind === undefined || node.kind === spec.subagentKind) &&
            facetRoleOf(node) === spec.subagentRole,
        isError: (node: FacetNode): boolean => node.status === 'failed' || node.kind === 'failure',
        isRetry: (node: FacetNode): boolean => node.kind === 'retry',
    },
    vocabulary: {
        provenanceEdgeKinds: new Set(spec.edgeKinds.provenance),
        readEdgeKinds: new Set(spec.edgeKinds.read),
        downstreamEdgeKinds: new Set(spec.edgeKinds.downstream),
    },
});

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

/** The shared turn/run view for domains that index runs by step. */
export const buildRunView = (
    nodes: readonly ViewNodeSource[],
    edges: readonly ViewEdgeSource[],
    roleOf: (node: ViewNodeSource) => string,
    rootRole: string,
    turnRole: string,
) => {
    const root = nodes.find((node) => roleOf(node) === rootRole)?.id ?? nodes[0]?.id ?? '';
    const activeRun = [...nodes]
        .reverse()
        .find((node) => roleOf(node) === 'run' && dataString(node, 'status') === 'active')?.id;
    const runByStepID = new Map<string, string>();

    for (const node of nodes) {
        const stepID = dataString(node, 'stepId');
        if (!stepID || roleOf(node) !== 'run') continue;
        const stepNode = nodes.find(
            (candidate) =>
                roleOf(candidate) === 'step' && dataString(candidate, 'stepId') === stepID,
        );
        runByStepID.set(stepNode?.id ?? stepID, node.id);
    }

    return {
        root,
        nodes: mapViewNodes(nodes),
        edges: mapViewEdges(edges),
        turns: nodes.filter((node) => roleOf(node) === turnRole).map((node) => node.id),
        activeRun,
        runByStepID,
    };
};

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
    let frontier = new Set<string>([start]);

    while (frontier.size) {
        const next = new Set<string>();
        for (const edge of view.edges) {
            if (!allowed.has(edge.kind)) continue;
            const from = direction === 'out' ? edge.source : edge.target;
            const to = direction === 'out' ? edge.target : edge.source;
            if (!frontier.has(from) || seen.has(to)) continue;
            answerIds.add(to);
            answerEdgeIds.add(edge.id);
            for (const parent of view.edges) {
                if (parent.target === to && parent.kind === 'contains')
                    contextIds.add(parent.source);
            }
            seen.add(to);
            next.add(to);
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
