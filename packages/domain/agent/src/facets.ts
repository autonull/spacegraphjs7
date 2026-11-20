import type { FacetAccessors } from '@spacegraphjs/search';
import type { TraceVocabulary } from '@spacegraphjs/trace';
import { facetRoleOf } from '@spacegraphjs/shared/domain';

export const agentFacetAccessors: FacetAccessors = {
    kind: (node) => node.kind,
    status: (node) => node.status ?? '',
    rootId: (model) => model.nodes.find((node) => node.kind === 'run')?.id ?? model.nodes[0]?.id ?? '',
    isFailedTool: (node) => node.kind === 'action' && node.status === 'failed',
    isFileWrite: (node) => node.kind === 'artifact' && typeof node.data?.path === 'string',
    isSubagentCall: (node) => node.kind === 'action' && facetRoleOf(node) === 'delegation',
    isError: (node) => node.status === 'failed' || node.kind === 'failure',
    isRetry: (node) => node.kind === 'retry',
};

export const agentTraceVocabulary: TraceVocabulary = {
    provenanceEdgeKinds: new Set(['writes', 'delegates']),
    readEdgeKinds: new Set(['contains']),
    downstreamEdgeKinds: new Set(['orders', 'writes', 'delegates']),
};
