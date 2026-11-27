import { defineDomain, type DomainVocabulary, type Kernel } from '@spacegraphjs/kernel';
import type { GraphNode, GraphViewData } from '@spacegraphjs/shared';
import {
    commonVocabulary,
    createRoleReader,
    createRoleTags,
    dataString,
    mapViewEdges,
    mapViewNodes,
    relationOf,
} from '@spacegraphjs/shared/domain';
import { SOURCE_SYMBOL_KINDS, type SourceSymbolKind } from './snapshot';

export const SOURCE_KINDS = ['package', 'file', ...SOURCE_SYMBOL_KINDS] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_EDGE_KINDS = ['contains', 'imports', 'exports', 'references', 'extends'] as const;
export type SourceEdgeKind = (typeof SOURCE_EDGE_KINDS)[number];

export const SOURCE_ROLES = [...SOURCE_KINDS, 'symbol'] as const;
export type SourceRole = (typeof SOURCE_ROLES)[number];

export const ROLE_TAGS = createRoleTags(SOURCE_ROLES);

export const SOURCE_RELATIONS = {
    parent: 'contains',
    dependency: 'imports',
    read: ['imports', 'references'],
    downstream: ['imports', 'exports', 'references'],
} as const;

export { dataString, relationOf };

export const roleOf = createRoleReader(ROLE_TAGS);

export interface SourceView extends GraphViewData {
    readonly root: string;
    readonly snapshotId: string;
}

export const sourceVocabulary: DomainVocabulary = {
    lanes: ['package', 'file', 'class', 'function', 'interface', 'type', 'const', 'enum', 'namespace'],
    ...commonVocabulary(roleOf),
    laneOf: (node) => dataString(node, 'lane') ?? roleOf(node),
    scopeIdOf: (node) => dataString(node, 'fileId') ?? dataString(node, 'packageId'),
    edgesVisibleAt: (edge, level) => level !== 'overview' || edge.kind === 'contains',
};

export function buildSourceView(kernel: Kernel, snapshotId = 'api'): SourceView {
    const nodes: GraphNode[] = mapViewNodes(kernel.nodes);
    const edges = mapViewEdges(kernel.edges);
    const root =
        kernel.nodes.find((node) => roleOf(node) === 'package')?.id ?? kernel.nodes[0]?.id ?? '';
    return {
        root,
        nodes,
        edges,
        snapshotId,
        turns: kernel.nodes.filter((node) => roleOf(node) === 'file').map((node) => node.id),
    };
}

export const sourceDomain = defineDomain<SourceView>({
    id: 'source',
    manifest: () => [
        { id: 'source.kind', values: [...SOURCE_KINDS], source: '@spacegraphjs/source' },
        {
            id: 'source.edge',
            values: [...SOURCE_EDGE_KINDS],
            source: '@spacegraphjs/source',
        },
    ],
    build: (kernel) => buildSourceView(kernel),
    vocabulary: sourceVocabulary,
});

export const isSymbolKind = (value: string): value is SourceSymbolKind =>
    (SOURCE_SYMBOL_KINDS as readonly string[]).includes(value);
