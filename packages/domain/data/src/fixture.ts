import { foldKernelOps, type KernelOp } from '@spacegraphjs/kernel';
import { ModelAdapter } from '@spacegraphjs/adapter';
import type { RenderEdge, RenderNode, NodeStatus } from '@spacegraphjs/renderer';
import type { GraphEdge, GraphNode } from '@spacegraphjs/shared';
import { DataEventMapper, type DataEvent } from './mapping';
import { roleOf, type DataView } from './vocabulary';

export type DataLevel = 'overview' | 'execution' | 'detail';

const fid = (...parts: string[]): string => ['data', ...parts].join(':');

/** A canonical provider-free pipeline with lineage, a regression, an improvement and an order. */
export const fixtureEvents = (): readonly DataEvent[] => [
    { type: 'pipeline-start', pipelineId: 'p1', name: 'Fraud pipeline', at: 1 },
    {
        type: 'dataset',
        pipelineId: 'p1',
        id: 'train',
        name: 'Training set',
        source: 'warehouse.parquet',
        at: 2,
    },
    { type: 'step-start', pipelineId: 'p1', stepId: 'features', at: 3 },
    { type: 'run-start', pipelineId: 'p1', stepId: 'features', runId: 'r1', at: 4 },
    { type: 'model', pipelineId: 'p1', id: 'gbdt', name: 'GBDT', stepId: 'features', at: 5 },
    {
        type: 'metric',
        pipelineId: 'p1',
        id: 'auc',
        name: 'AUC',
        value: 0.91,
        baseline: 0.93,
        stepId: 'features',
        runId: 'r1',
        at: 6,
    },
    {
        type: 'metric',
        pipelineId: 'p1',
        id: 'latency',
        name: 'Latency ms',
        value: 42,
        baseline: 40,
        stepId: 'features',
        runId: 'r1',
        at: 7,
    },
    {
        type: 'run-end',
        pipelineId: 'p1',
        stepId: 'features',
        runId: 'r1',
        status: 'complete',
        at: 8,
    },
    { type: 'step-end', pipelineId: 'p1', stepId: 'features', at: 9 },
    { type: 'step-start', pipelineId: 'p1', stepId: 'score', at: 10 },
    { type: 'run-start', pipelineId: 'p1', stepId: 'score', runId: 'r2', at: 11 },
    {
        type: 'metric',
        pipelineId: 'p1',
        id: 'f1',
        name: 'F1',
        value: 0.88,
        baseline: 0.8,
        stepId: 'score',
        runId: 'r2',
        at: 12,
    },
    { type: 'run-end', pipelineId: 'p1', stepId: 'score', runId: 'r2', status: 'complete', at: 13 },
    { type: 'step-end', pipelineId: 'p1', stepId: 'score', at: 14 },
    { type: 'pipeline-end', pipelineId: 'p1', status: 'complete', at: 15 },
];

export const foldDataOps = foldKernelOps;

/** Host-level facts the event stream does not carry: lineage, evaluation and step order. */
export function fixtureOps(): readonly KernelOp[] {
    const mapper = new DataEventMapper();
    const extra: KernelOp[] = [
        {
            op: 'add-edge',
            edge: {
                id: 'feeds:train:features',
                kind: 'feeds',
                source: fid('p1', 'train'),
                target: fid('p1', 'features'),
            },
        },
        ...['auc', 'latency'].map((id) => ({
            op: 'add-edge' as const,
            edge: {
                id: `evaluates:gbdt:${id}`,
                kind: 'evaluates',
                source: fid('p1', 'gbdt'),
                target: fid('p1', id),
            },
        })),
        {
            op: 'add-edge',
            edge: {
                id: 'orders:features:score',
                kind: 'orders',
                source: fid('p1', 'features'),
                target: fid('p1', 'score'),
            },
        },
    ];
    return [...fixtureEvents().flatMap((event) => mapper.map(event)), ...extra];
}

export class DataAdapter extends ModelAdapter<GraphNode, GraphEdge, DataLevel, DataView> {
    nodeShape(node: GraphNode): RenderNode['shape'] {
        const role = roleOf(node);
        return role === 'metric' || role === 'model' ? 'card' : 'panel';
    }

    nodeStatus(node: GraphNode): NodeStatus {
        if (node.status === 'failed') return 'error';
        if (node.status === 'active') return 'running';
        return 'success';
    }

    isStructuralKind(kind: GraphNode['kind']): boolean {
        return kind === 'pipeline' || kind === 'dataset';
    }

    nodeData(node: GraphNode, level: DataLevel, dimmed: boolean): Record<string, unknown> {
        return { level, dimmed, kind: node.kind, role: roleOf(node) };
    }

    toRenderEdge(edge: GraphEdge, _level: DataLevel): RenderEdge {
        return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
            visible: true,
        };
    }
}

export const FIXTURE_POSITIONS = new Map<string, { x: number; y: number; z: number }>([
    [fid('p1', 'pipeline'), { x: 0, y: 0, z: 0 }],
    [fid('p1', 'train'), { x: 160, y: 160, z: 0 }],
    [fid('p1', 'features'), { x: 200, y: 0, z: 0 }],
    [fid('p1', 'r1'), { x: 400, y: 0, z: 0 }],
    [fid('p1', 'gbdt'), { x: 400, y: 160, z: 0 }],
    [fid('p1', 'auc'), { x: 600, y: -80, z: 0 }],
    [fid('p1', 'latency'), { x: 600, y: 80, z: 0 }],
    [fid('p1', 'score'), { x: 800, y: 320, z: 0 }],
    [fid('p1', 'r2'), { x: 1000, y: 320, z: 0 }],
    [fid('p1', 'f1'), { x: 1200, y: 320, z: 0 }],
]);

export const dataAdapter = new DataAdapter({
    cardBudget: 8,
    neighbors: (_view, id) => (id === fid('p1', 'auc') ? [fid('p1', 'gbdt'), fid('p1', 'r1')] : []),
});
