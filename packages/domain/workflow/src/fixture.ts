import { foldKernelOps, type KernelOp } from '@spacegraphjs/kernel';
import { VocabularyAdapter, type AdapterConfig } from '@spacegraphjs/adapter';
import type { GraphEdge, GraphNode } from '@spacegraphjs/shared';
import { WorkflowEventMapper, type WorkflowEvent } from './mapping';
import { roleOf, type WorkflowView } from './vocabulary';

export type WorkflowLevel = 'overview' | 'execution' | 'detail';

const fid = (...parts: string[]): string => ['workflow', ...parts].join(':');

/** A canonical provider-free run containing an artifact, a failure, a retry and a subworkflow. */
export const fixtureEvents = (): readonly WorkflowEvent[] => [
    { type: 'workflow-start', workflowId: 'wf', name: 'Release', at: 1 },
    { type: 'trigger', workflowId: 'wf', source: 'manual', at: 2 },
    { type: 'subworkflow-start', workflowId: 'wf', subworkflowId: 'build', at: 3 },
    { type: 'step-start', workflowId: 'wf', stepId: 'compile', subworkflowId: 'build', at: 4 },
    { type: 'run-start', workflowId: 'wf', stepId: 'compile', runId: 'r1', at: 5 },
    {
        type: 'artifact',
        workflowId: 'wf',
        stepId: 'compile',
        runId: 'r1',
        id: 'out',
        path: 'dist/app.js',
        producerId: 'r1',
        at: 6,
    },
    { type: 'run-end', workflowId: 'wf', stepId: 'compile', runId: 'r1', status: 'failed', at: 7 },
    {
        type: 'retry',
        workflowId: 'wf',
        stepId: 'compile',
        runId: 'r1',
        id: 'retry-1',
        reason: 'flaky',
        at: 8,
    },
    { type: 'step-end', workflowId: 'wf', stepId: 'compile', status: 'failed', at: 9 },
    { type: 'step-start', workflowId: 'wf', stepId: 'notify', at: 10 },
    { type: 'step-end', workflowId: 'wf', stepId: 'notify', at: 11 },
    { type: 'workflow-end', workflowId: 'wf', status: 'complete', at: 12 },
];

export const foldWorkflowOps = foldKernelOps;

/** Host-level facts the event stream does not carry: explicit ordering and delegation. */
export function fixtureOps(): readonly KernelOp[] {
    const mapper = new WorkflowEventMapper();
    const events = fixtureEvents();
    const extra: KernelOp[] = [
        {
            op: 'add-edge',
            edge: {
                id: 'orders:compile:notify',
                kind: 'orders',
                source: fid('wf', 'compile'),
                target: fid('wf', 'notify'),
            },
        },
        {
            op: 'add-edge',
            edge: {
                id: 'delegates:root:build',
                kind: 'delegates',
                source: fid('wf', 'workflow'),
                target: fid('wf', 'build'),
            },
        },
    ];
    return [...events.flatMap((event) => mapper.map(event)), ...extra];
}

export class WorkflowAdapter extends VocabularyAdapter<
    GraphNode,
    GraphEdge,
    WorkflowLevel,
    WorkflowView
> {
    constructor(config: AdapterConfig<GraphNode, GraphEdge, WorkflowLevel, WorkflowView> = {}) {
        super(
            {
                cardRoles: ['step', 'run', 'retry'],
                structuralKinds: ['workflow', 'subworkflow'],
                roleOf,
            },
            config,
        );
    }
}

export const FIXTURE_POSITIONS = new Map<string, { x: number; y: number; z: number }>([
    [fid('wf', 'workflow'), { x: 0, y: 0, z: 0 }],
    [fid('wf', 'trigger', '1'), { x: 160, y: 160, z: 0 }],
    [fid('wf', 'build'), { x: 200, y: 0, z: 0 }],
    [fid('wf', 'compile'), { x: 400, y: 0, z: 0 }],
    [fid('wf', 'r1'), { x: 600, y: 0, z: 0 }],
    [fid('wf', 'out'), { x: 800, y: 0, z: 0 }],
    [fid('wf', 'compile', 'retry', 'retry-1'), { x: 600, y: 160, z: 0 }],
    [fid('wf', 'notify'), { x: 800, y: 320, z: 0 }],
]);

export const workflowAdapter = new WorkflowAdapter({
    cardBudget: 8,
    neighbors: (_view, id) => (id === fid('wf', 'compile') ? [fid('wf', 'r1')] : []),
});
