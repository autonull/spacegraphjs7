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

export const ROLE_TAGS = createRoleTags(DATA_ROLES);

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
    ...commonVocabulary(roleOf),
    laneOf: (node) =>
        dataString(node, 'lane') ?? (roleOf(node) === 'pipeline' ? 'pipeline' : undefined),
    scopeIdOf: (node) => dataString(node, 'stepId') ?? dataString(node, 'pipelineId'),
    edgesVisibleAt: (edge, level) =>
        level !== 'overview' || (edge.kind !== 'orders' && edge.kind !== 'evaluates'),
};

export function buildDataView(kernel: Kernel): DataView {
    return buildRunView(kernel.nodes, kernel.edges, roleOf, 'pipeline', 'step');
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
