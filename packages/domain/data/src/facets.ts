import type { FacetAccessors } from '@spacegraphjs/search';
import { createDomainFacets } from '@spacegraphjs/shared/domain';
import type { TraceVocabulary } from '@spacegraphjs/trace';

const { accessors, vocabulary } = createDomainFacets({
    rootKind: 'pipeline',
    failedToolKind: 'run',
    fileWriteKind: 'dataset',
    fileWriteDataKey: 'source',
    subagentRole: 'retry',
    edgeKinds: {
        provenance: ['evaluates', 'writes'],
        read: ['contains', 'feeds'],
        downstream: ['orders', 'writes', 'feeds', 'evaluates'],
    },
});

export const dataFacetAccessors: FacetAccessors = accessors;
export const dataTraceVocabulary: TraceVocabulary = vocabulary;
