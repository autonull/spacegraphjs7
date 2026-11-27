import type { FacetAccessors } from '@spacegraphjs/search';
import { createDomainFacets } from '@spacegraphjs/shared/domain';
import type { TraceVocabulary } from '@spacegraphjs/trace';

const { accessors, vocabulary } = createDomainFacets({
    rootKind: 'package',
    failedToolKind: 'function',
    fileWriteKind: 'file',
    fileWriteDataKey: 'path',
    subagentRole: 'namespace',
    edgeKinds: {
        provenance: ['exports', 'references'],
        read: ['contains', 'imports', 'references'],
        downstream: ['imports', 'exports', 'references'],
    },
});

export const sourceFacetAccessors: FacetAccessors = accessors;
export const sourceTraceVocabulary: TraceVocabulary = vocabulary;
