import { defineDomain, type DomainVocabulary, type Kernel } from '@spacegraphjs/kernel';
import type { GraphNode, GraphViewData } from '@spacegraphjs/shared';
import {
    createRoleReader,
    dataString,
    mapViewEdges,
    mapViewNodes,
    relationOf,
} from '@spacegraphjs/shared/domain';

export const DATA_KINDS = ['pipeline', 'dataset', 'step', 'run', 'model', 'metric'] as const;
export type DataKind = (typeof DATA_KINDS)[number];

export const EDGE_KINDS = [
    'contains',
    'orders',
    'feeds',
    'writes',
    'evaluates',
    'retries',
] as const;
export type DataEdgeKind = (typeof EDGE_KINDS)[number];

export const DATA_ROLES = [
    'pipeline',
    'dataset',
    'step',
    'run',
    'model',
    'metric',
    'failure',
    'retry',
] as const;
export type DataRole = (typeof DATA_ROLES)[number];

export const ROLE_TAGS: Readonly<Record<string, DataRole>> = {
    pipeline: 'pipeline',
    dataset: 'dataset',
    step: 'step',
    run: 'run',
    model: 'model',
    metric: 'metric',
};

/** Relations are conventions over ordinary edges; hosts may tag their own with `data.relation`. */
export const DATA_RELATIONS = {
    parent: 'contains',
    order: 'orders',
    feed: 'feeds',
    write: ['writes', 'produces'],
    read: ['reads', 'uses'],
    evaluate: 'evaluates',
} as const;

export { dataString, relationOf };

/** A node's advisory role: host tag first, then the default kind mapping, then its open-ended kind. */
export const roleOf = createRoleReader(ROLE_TAGS);

export interface DataView extends GraphViewData {
    readonly root: string;
    readonly runByStepID?: ReadonlyMap<string, string>;
    readonly activeRun?: string;
}

export const dataVocabulary: DomainVocabulary = {
    lanes: ['pipeline', 'step', 'run', 'metric'],
    levels: ['overview', 'execution', 'detail'],
    laneOf: (node) =>
        dataString(node, 'lane') ?? (roleOf(node) === 'pipeline' ? 'pipeline' : undefined),
    scopeIdOf: (node) => dataString(node, 'stepId') ?? dataString(node, 'pipelineId'),
    shapeOf: (node) => roleOf(node),
    statusOf: (node) => node.status ?? dataString(node, 'status'),
    edgesVisibleAt: (edge, level) =>
        level !== 'overview' || (edge.kind !== 'orders' && edge.kind !== 'evaluates'),
};

export function buildDataView(kernel: Kernel): DataView {
    const nodes: GraphNode[] = mapViewNodes(kernel.nodes);
    const edges = mapViewEdges(kernel.edges);
    const root =
        kernel.nodes.find((node) => roleOf(node) === 'pipeline')?.id ?? kernel.nodes[0]?.id ?? '';
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

export const dataDomain = defineDomain<DataView>({
    id: 'data',
    manifest: () => [
        { id: 'data.kind', values: [...DATA_KINDS], source: '@spacegraphjs/data' },
        { id: 'data.edge', values: [...EDGE_KINDS], source: '@spacegraphjs/data' },
    ],
    build: buildDataView,
    vocabulary: dataVocabulary,
});
