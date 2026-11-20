import type { FacetAccessors } from '@spacegraphjs/search';
import type { TraceVocabulary } from '@spacegraphjs/trace';
import { facetRoleOf } from '@spacegraphjs/shared/domain';

export const filesystemFacetAccessors: FacetAccessors = {
    kind: (node) => node.kind,
    status: (node) => node.status ?? '',
    rootId: (model) =>
        model.nodes.find((node) => node.kind === 'commit')?.id ?? model.nodes[0]?.id ?? '',
    isFailedTool: (node) => node.kind === 'change' && node.status === 'failed',
    isFileWrite: (node) => node.kind === 'change' && typeof node.data?.path === 'string',
    isSubagentCall: (node) => facetRoleOf(node) === 'retry',
    isError: (node) => node.status === 'failed' || node.kind === 'failure',
    isRetry: (node) => node.kind === 'retry',
};

export const filesystemTraceVocabulary: TraceVocabulary = {
    provenanceEdgeKinds: new Set(['writes', 'produces']),
    readEdgeKinds: new Set(['contains', 'depends']),
    downstreamEdgeKinds: new Set(['orders', 'writes', 'produces', 'depends']),
};
