import {
    WORKFLOW_RELATIONS,
    dataString,
    relationOf,
    roleOf,
    type WorkflowView,
} from './vocabulary';

export type WorkflowTrace = {
    readonly answerIds: ReadonlySet<string>;
    readonly contextIds: ReadonlySet<string>;
    readonly answerEdgeIds: ReadonlySet<string>;
};

const walk = (
    view: WorkflowView,
    start: string,
    direction: 'in' | 'out',
    kinds: readonly string[],
): WorkflowTrace => {
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

const TRACE_KINDS: Readonly<Record<string, readonly string[]>> = {
    why: ['writes', 'delegates', 'contains'],
    'led-here': ['orders'],
    downstream: ['orders', 'writes', 'delegates', 'retries'],
    upstream: ['contains', 'orders', 'retries'],
    related: ['contains', 'writes', 'delegates', 'orders', 'retries'],
};

export const why = (view: WorkflowView, id: string): WorkflowTrace =>
    walk(view, id, 'in', TRACE_KINDS.why!);
export const ledHere = (view: WorkflowView, id: string): WorkflowTrace =>
    walk(view, id, 'out', TRACE_KINDS['led-here']!);
export const downstream = (view: WorkflowView, id: string): WorkflowTrace =>
    walk(view, id, 'out', TRACE_KINDS.downstream!);
export const upstream = (view: WorkflowView, id: string): WorkflowTrace =>
    walk(view, id, 'in', TRACE_KINDS.upstream!);
export const related = (view: WorkflowView, id: string): WorkflowTrace =>
    walk(view, id, 'in', TRACE_KINDS.related!);

/** A retry node, the run it retried and the step that owns it. */
export type WorkflowRetry = {
    readonly id: string;
    readonly label: string;
    readonly reason: string | undefined;
    readonly stepID: string | undefined;
    readonly runID: string | undefined;
    readonly targetID: string | undefined;
};

export const retryChains = (view: WorkflowView): readonly WorkflowRetry[] => {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    return view.nodes
        .filter((node) => roleOf(node) === 'retry')
        .map((node) => {
            const target = view.edges.find(
                (edge) => edge.kind === 'retries' && edge.source === node.id,
            );
            return {
                id: node.id,
                label: node.label,
                reason: dataString(node, 'reason'),
                stepID: dataString(node, 'stepId'),
                runID: dataString(node, 'runId'),
                targetID: target?.target,
            };
        });
};

/** Steps that must precede a step through explicit ordering edges. */
export const stepDependencies = (view: WorkflowView, stepID: string): readonly string[] => [
    ...walk(view, stepID, 'in', ['orders']).answerIds,
];

/** Artifacts with their first-write-order producers and readers. */
export type WorkflowArtifactFlow = {
    readonly id: string;
    readonly path: string;
    readonly writers: readonly string[];
    readonly readers: readonly string[];
};

export const artifactProducers = (view: WorkflowView): readonly WorkflowArtifactFlow[] => {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    const isArtifact = (id: string) => {
        const node = nodes.get(id);
        return node !== undefined && roleOf(node) === 'artifact';
    };
    const writes = new Set<string>(WORKFLOW_RELATIONS.write);
    const reads = new Set<string>(WORKFLOW_RELATIONS.read);
    const flows = new Map<
        string,
        { id: string; path: string; writers: string[]; readers: string[] }
    >();
    const order: string[] = [];

    for (const edge of view.edges) {
        if (!isArtifact(edge.target) || !writes.has(relationOf(edge))) continue;
        if (!flows.has(edge.target)) {
            const node = nodes.get(edge.target)!;
            flows.set(edge.target, {
                id: edge.target,
                path: dataString(node, 'path') ?? node.label,
                writers: [],
                readers: [],
            });
            order.push(edge.target);
        }
        flows.get(edge.target)!.writers.push(edge.source);
    }
    for (const edge of view.edges) {
        if (!isArtifact(edge.target) || !reads.has(relationOf(edge))) continue;
        flows.get(edge.target)?.readers.push(edge.source);
    }

    return order.map((id) => flows.get(id)!);
};

/** Steps in a subworkflow that produced artifacts, directly or through their runs. */
export const subworkflowContributions = (
    view: WorkflowView,
    subworkflowID: string,
): readonly string[] => {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    const owningStep = (writerID: string): string | undefined => {
        let current = writerID;
        while (true) {
            const parent = view.edges.find(
                (edge) => edge.kind === 'contains' && edge.target === current,
            )?.source;
            if (!parent) return undefined;
            if (roleOf(nodes.get(parent) ?? { kind: '' }) === 'step') return parent;
            current = parent;
        }
    };
    const writers = new Set(
        artifactProducers(view)
            .flatMap((flow) => flow.writers)
            .map(owningStep)
            .filter((id): id is string => id !== undefined),
    );
    const stepIDs = view.edges
        .filter((edge) => edge.kind === 'contains' && edge.source === subworkflowID)
        .map((edge) => edge.target);
    return stepIDs.filter(
        (id) => roleOf(nodes.get(id) ?? { kind: '' }) === 'step' && writers.has(id),
    );
};
