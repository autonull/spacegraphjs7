import type { FacetAccessors } from '@spacegraphjs/search';
import { createDomainFacets } from '@spacegraphjs/shared/domain';
import type { TraceVocabulary } from '@spacegraphjs/trace';

const { accessors, vocabulary } = createDomainFacets({
    rootKind: 'workflow',
    failedToolKind: 'step',
    fileWriteKind: 'artifact',
    fileWriteDataKey: 'path',
    subagentRole: 'subworkflow',
    subagentKind: 'action',
    edgeKinds: {
        provenance: ['writes', 'delegates'],
        read: ['contains'],
        downstream: ['orders', 'writes', 'delegates', 'retries'],
    },
});

export const workflowFacetAccessors: FacetAccessors = accessors;
export const workflowTraceVocabulary: TraceVocabulary = vocabulary;
