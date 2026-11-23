import type { FacetAccessors } from '@spacegraphjs/search';
import { createDomainFacets } from '@spacegraphjs/shared/domain';
import type { TraceVocabulary } from '@spacegraphjs/trace';

const { accessors, vocabulary } = createDomainFacets({
    rootKind: 'commit',
    failedToolKind: 'change',
    fileWriteKind: 'change',
    fileWriteDataKey: 'path',
    subagentRole: 'retry',
    edgeKinds: {
        provenance: ['writes', 'produces'],
        read: ['contains', 'depends'],
        downstream: ['orders', 'writes', 'produces', 'depends'],
    },
});

export const filesystemFacetAccessors: FacetAccessors = accessors;
export const filesystemTraceVocabulary: TraceVocabulary = vocabulary;
