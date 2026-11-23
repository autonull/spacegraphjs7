import { defineDomain, type DomainVocabulary, type Kernel } from '@spacegraphjs/kernel';
import type { GraphViewData } from '@spacegraphjs/shared';
import {
    buildRunView,
    commonVocabulary,
    createRoleReader,
    createRoleTags,
    dataString,
    relationOf,
} from '@spacegraphjs/shared/domain';

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

export const ROLE_TAGS = createRoleTags(WORKFLOW_ROLES);

/** Relations are conventions over ordinary edges; hosts may tag their own with `data.relation`. */
export const WORKFLOW_RELATIONS = {
    parent: 'contains',
    order: 'orders',
    write: ['writes', 'produces'],
    read: ['reads', 'uses'],
    delegate: 'delegates',
    retry: 'retries',
} as const;

export { dataString, relationOf };

/** A node's advisory role: host tag first, then the default kind mapping, then its open-ended kind. */
export const roleOf = createRoleReader(ROLE_TAGS);

export interface WorkflowView extends GraphViewData {
    readonly root: string;
    readonly runByStepID?: ReadonlyMap<string, string>;
    readonly activeRun?: string;
}

export const workflowVocabulary: DomainVocabulary = {
    lanes: ['workflow', 'step', 'run', 'artifact'],
    ...commonVocabulary(roleOf),
    laneOf: (node) =>
        dataString(node, 'lane') ?? (roleOf(node) === 'workflow' ? 'workflow' : undefined),
    scopeIdOf: (node) =>
        dataString(node, 'subworkflowId') ??
        dataString(node, 'stepId') ??
        dataString(node, 'workflowId'),
    edgesVisibleAt: (edge, level) => level !== 'overview' || edge.kind !== 'orders',
};

export function buildWorkflowView(kernel: Kernel): WorkflowView {
    return buildRunView(kernel.nodes, kernel.edges, roleOf, 'workflow', 'step');
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
