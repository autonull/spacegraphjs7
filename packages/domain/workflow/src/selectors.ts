import {
    createTraceSelectors,
    groupEdgesByTarget,
    walk,
    type Trace,
} from '@spacegraphjs/shared/domain';
import { WORKFLOW_RELATIONS, dataString, roleOf, type WorkflowView } from './vocabulary';

export type WorkflowTrace = Trace;

const TRACE_KINDS: Readonly<Record<string, readonly string[]>> = {
    why: ['writes', 'delegates', 'contains'],
    'led-here': ['orders'],
    downstream: ['orders', 'writes', 'delegates', 'retries'],
    upstream: ['contains', 'orders', 'retries'],
    related: ['contains', 'writes', 'delegates', 'orders', 'retries'],
};

export const { why, ledHere, downstream, upstream, related } =
    createTraceSelectors<WorkflowView>(TRACE_KINDS);

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
    const targetBySource = new Map<string, string>();
    for (const edge of view.edges) {
        if (edge.kind === 'retries' && !targetBySource.has(edge.source)) {
            targetBySource.set(edge.source, edge.target);
        }
    }
    return view.nodes
        .filter((node) => roleOf(node) === 'retry')
        .map((node) => ({
            id: node.id,
            label: node.label,
            reason: dataString(node, 'reason'),
            stepID: dataString(node, 'stepId'),
            runID: dataString(node, 'runId'),
            targetID: targetBySource.get(node.id),
        }));
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

export const artifactProducers = (view: WorkflowView): readonly WorkflowArtifactFlow[] =>
    groupEdgesByTarget(view.nodes, view.edges, {
        isTarget: (node) => roleOf(node) === 'artifact',
        writes: WORKFLOW_RELATIONS.write,
        reads: WORKFLOW_RELATIONS.read,
    });

/** Steps in a subworkflow that produced artifacts, directly or through their runs. */
export const subworkflowContributions = (
    view: WorkflowView,
    subworkflowID: string,
): readonly string[] => {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    const parentByChild = new Map<string, string>();
    for (const edge of view.edges) {
        if (edge.kind === 'contains' && !parentByChild.has(edge.target)) {
            parentByChild.set(edge.target, edge.source);
        }
    }
    const owningStep = (writerID: string): string | undefined => {
        let current = writerID;
        while (true) {
            const parent = parentByChild.get(current);
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
