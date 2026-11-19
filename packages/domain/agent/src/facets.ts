import type { FacetAccessors } from '@spacegraphjs/search';
import type { TraceVocabulary } from '@spacegraphjs/trace';
import { dataString } from './vocabulary';

const roleOf = (node: {
    readonly data?: Readonly<Record<string, unknown>>;
}): string | undefined => dataString(node, 'role') ?? dataString(node, 'kind');

export const agentFacetAccessors: FacetAccessors = {
    kind: (node) => node.kind,
    status: (node) => node.status ?? '',
    rootId: (model) => model.nodes.find((node) => node.kind === 'run')?.id ?? model.nodes[0]?.id ?? '',
    isFailedTool: (node) => node.kind === 'action' && node.status === 'failed',
    isFileWrite: (node) => node.kind === 'artifact' && typeof node.data?.path === 'string',
    isSubagentCall: (node) => node.kind === 'action' && roleOf(node) === 'delegation',
    isError: (node) => node.status === 'failed' || node.kind === 'failure',
    isRetry: (node) => node.kind === 'retry',
};

export const agentTraceVocabulary: TraceVocabulary = {
    provenanceEdgeKinds: new Set(['writes', 'delegates']),
    readEdgeKinds: new Set(['contains']),
    downstreamEdgeKinds: new Set(['orders', 'writes', 'delegates']),
};
