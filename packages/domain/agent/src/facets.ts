import type { FacetAccessors } from '@spacegraphjs/search';
import { createDomainFacets } from '@spacegraphjs/shared/domain';
import type { TraceVocabulary } from '@spacegraphjs/trace';

const { accessors, vocabulary } = createDomainFacets({
    rootKind: 'run',
    failedToolKind: 'action',
    fileWriteKind: 'artifact',
    fileWriteDataKey: 'path',
    subagentRole: 'delegation',
    subagentKind: 'action',
    edgeKinds: {
        provenance: ['writes', 'delegates'],
        read: ['contains'],
        downstream: ['orders', 'writes', 'delegates'],
    },
});

export const agentFacetAccessors: FacetAccessors = accessors;
export const agentTraceVocabulary: TraceVocabulary = vocabulary;
