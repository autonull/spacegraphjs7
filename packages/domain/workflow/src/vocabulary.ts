import { defineDomain, type DomainVocabulary, type Kernel } from '@spacegraphjs/kernel';
import type { GraphNode, GraphViewData } from '@spacegraphjs/shared';

export const WORKFLOW_KINDS = [
    'workflow',
    'subworkflow',
    'step',
    'run',
    'trigger',
    'artifact',
    'retry',
] as const;
export type WorkflowKind = (typeof WORKFLOW_KINDS)[number];

export const EDGE_KINDS = ['contains', 'orders', 'delegates', 'writes', 'retries'] as const;
export type WorkflowEdgeKind = (typeof EDGE_KINDS)[number];

export const WORKFLOW_ROLES = [
    'workflow',
    'subworkflow',
    'step',
    'run',
    'trigger',
    'failure',
    'retry',
    'artifact',
    'state',
] as const;
export type WorkflowRole = (typeof WORKFLOW_ROLES)[number];

export const ROLE_TAGS: Readonly<Record<string, WorkflowRole>> = {
    workflow: 'workflow',
    subworkflow: 'subworkflow',
    step: 'step',
    run: 'run',
    trigger: 'trigger',
    retry: 'retry',
    artifact: 'artifact',
};

/** Relations are conventions over ordinary edges; hosts may tag their own with `data.relation`. */
export const WORKFLOW_RELATIONS = {
    parent: 'contains',
    order: 'orders',
    write: ['writes', 'produces'],
    read: ['reads', 'uses'],
    delegate: 'delegates',
    retry: 'retries',
} as const;

const text = (value: unknown): string | undefined =>
    typeof value === 'string' ? value : undefined;

export const dataString = (
    node: { readonly data?: Readonly<Record<string, unknown>> },
    key: string,
): string | undefined => text(node.data?.[key]);

/** A node's advisory role: host tag first, then the default kind mapping, then its open-ended kind. */
export const roleOf = (node: {
    readonly kind: string;
    readonly data?: Readonly<Record<string, unknown>>;
}): string => dataString(node, 'role') ?? ROLE_TAGS[node.kind] ?? node.kind;

/** An edge's advisory relation: host tag first, then its open-ended kind. */
export const relationOf = (edge: {
    readonly kind: string;
    readonly data?: Readonly<Record<string, unknown>>;
}): string => dataString(edge, 'relation') ?? edge.kind;

export interface WorkflowView extends GraphViewData {
    readonly root: string;
    readonly runByStepID?: ReadonlyMap<string, string>;
    readonly activeRun?: string;
}

export const workflowVocabulary: DomainVocabulary = {
    lanes: ['workflow', 'step', 'run', 'artifact'],
    levels: ['overview', 'execution', 'detail'],
    laneOf: (node) =>
        dataString(node, 'lane') ?? (roleOf(node) === 'workflow' ? 'workflow' : undefined),
    scopeIdOf: (node) =>
        dataString(node, 'subworkflowId') ??
        dataString(node, 'stepId') ??
        dataString(node, 'workflowId'),
    shapeOf: (node) => roleOf(node),
    statusOf: (node) => node.status ?? dataString(node, 'status'),
    edgesVisibleAt: (edge, level) => level !== 'overview' || edge.kind !== 'orders',
};

export function buildWorkflowView(kernel: Kernel): WorkflowView {
    const nodes: GraphNode[] = kernel.nodes.map((node) => ({
        id: node.id,
        kind: node.kind,
        label: node.label,
        summary: dataString(node, 'summary'),
        status: dataString(node, 'status') ?? (node.data?.isError === true ? 'failed' : 'complete'),
        data: { ...node.data },
    }));
    const edges = kernel.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        kind: edge.kind,
        confidence:
            edge.data?.confidence === 'structural'
                ? ('structural' as const)
                : ('explicit' as const),
        data: { ...edge.data },
    }));
    const root =
        kernel.nodes.find((node) => roleOf(node) === 'workflow')?.id ?? kernel.nodes[0]?.id ?? '';
    const activeRun = [...kernel.nodes]
        .reverse()
        .find((node) => roleOf(node) === 'run' && dataString(node, 'status') === 'active')?.id;
    const runByStepID = new Map<string, string>();
    for (const node of kernel.nodes) {
        const stepID = dataString(node, 'stepId');
        if (!stepID || roleOf(node) !== 'run') continue;
        const stepNode = kernel.nodes.find(
            (candidate) =>
                roleOf(candidate) === 'step' && dataString(candidate, 'stepId') === stepID,
        );
        runByStepID.set(stepNode?.id ?? stepID, node.id);
    }

    return {
        root,
        nodes,
        edges,
        turns: kernel.nodes.filter((node) => roleOf(node) === 'step').map((node) => node.id),
        activeRun,
        runByStepID,
    };
}

export const workflowDomain = defineDomain<WorkflowView>({
    id: 'workflow',
    manifest: () => [
        { id: 'workflow.kind', values: [...WORKFLOW_KINDS], source: '@spacegraphjs/workflow' },
        { id: 'workflow.edge', values: [...EDGE_KINDS], source: '@spacegraphjs/workflow' },
    ],
    build: buildWorkflowView,
    vocabulary: workflowVocabulary,
});
