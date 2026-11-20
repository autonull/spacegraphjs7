import type { FacetAccessors } from '@spacegraphjs/search';
import type { TraceVocabulary } from '@spacegraphjs/trace';
import { facetRoleOf } from '@spacegraphjs/shared/domain';

export const dataFacetAccessors: FacetAccessors = {
    kind: (node) => node.kind,
    status: (node) => node.status ?? '',
    rootId: (model) =>
        model.nodes.find((node) => node.kind === 'pipeline')?.id ?? model.nodes[0]?.id ?? '',
    isFailedTool: (node) => node.kind === 'run' && node.status === 'failed',
    isFileWrite: (node) => node.kind === 'dataset' && typeof node.data?.source === 'string',
    isSubagentCall: (node) => facetRoleOf(node) === 'retry',
    isError: (node) => node.status === 'failed' || node.kind === 'failure',
    isRetry: (node) => node.kind === 'retry',
};

export const dataTraceVocabulary: TraceVocabulary = {
    provenanceEdgeKinds: new Set(['evaluates', 'writes']),
    readEdgeKinds: new Set(['contains', 'feeds']),
    downstreamEdgeKinds: new Set(['orders', 'writes', 'feeds', 'evaluates']),
};
