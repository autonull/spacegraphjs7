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

export const FILESYSTEM_KINDS = ['commit', 'file', 'symbol', 'change', 'artifact'] as const;
export type FilesystemKind = (typeof FILESYSTEM_KINDS)[number];

export const EDGE_KINDS = ['contains', 'orders', 'writes', 'depends', 'produces'] as const;
export type FilesystemEdgeKind = (typeof EDGE_KINDS)[number];

export const FILESYSTEM_ROLES = [
    'commit',
    'file',
    'symbol',
    'change',
    'artifact',
    'failure',
    'retry',
] as const;
export type FilesystemRole = (typeof FILESYSTEM_ROLES)[number];

export const ROLE_TAGS = createRoleTags(FILESYSTEM_ROLES);

/** Relations are conventions over ordinary edges; hosts may tag their own with `data.relation`. */
export const FILESYSTEM_RELATIONS = {
    parent: 'contains',
    order: 'orders',
    write: ['writes', 'produces'],
    read: ['reads', 'uses'],
    dependency: 'depends',
} as const;

export { dataString, relationOf };

/** A node's advisory role: host tag first, then the default kind mapping, then its open-ended kind. */
export const roleOf = createRoleReader(ROLE_TAGS);

export interface FileSystemView extends GraphViewData {
    readonly root: string;
    readonly changeByFile?: ReadonlyMap<string, string>;
    readonly activeChange?: string;
}

export const filesystemVocabulary: DomainVocabulary = {
    lanes: ['commit', 'file', 'symbol', 'change'],
    ...commonVocabulary(roleOf),
    laneOf: (node) =>
        dataString(node, 'lane') ?? (roleOf(node) === 'commit' ? 'commit' : undefined),
    scopeIdOf: (node) => dataString(node, 'fileId') ?? dataString(node, 'commitId'),
    edgesVisibleAt: (edge, level) =>
        level !== 'overview' || (edge.kind !== 'orders' && edge.kind !== 'depends'),
};

export function buildFileSystemView(kernel: Kernel): FileSystemView {
    const nodes: GraphNode[] = mapViewNodes(kernel.nodes);
    const edges = mapViewEdges(kernel.edges);
    const root =
        kernel.nodes.find((node) => roleOf(node) === 'commit')?.id ?? kernel.nodes[0]?.id ?? '';
    const activeChange = [...kernel.nodes]
        .reverse()
        .find((node) => roleOf(node) === 'change' && dataString(node, 'status') === 'active')?.id;
    const fileByID = new Map(
        kernel.nodes.flatMap((node) => {
            const fileID = dataString(node, 'fileId');
            return roleOf(node) === 'file' && fileID ? [[fileID, node.id] as const] : [];
        }),
    );
    const changeByFile = new Map<string, string>();
    for (const node of kernel.nodes) {
        if (roleOf(node) !== 'change') continue;
        const fileID = dataString(node, 'fileId');
        if (!fileID || changeByFile.has(fileID)) continue;
        changeByFile.set(fileByID.get(fileID) ?? fileID, node.id);
    }

    return {
        root,
        nodes,
        edges,
        turns: kernel.nodes.filter((node) => roleOf(node) === 'change').map((node) => node.id),
        changeByFile,
        activeChange,
    };
}

export const filesystemDomain = defineDomain<FileSystemView>({
    id: 'filesystem',
    manifest: () => [
        {
            id: 'filesystem.kind',
            values: [...FILESYSTEM_KINDS],
            source: '@spacegraphjs/filesystem',
        },
        { id: 'filesystem.edge', values: [...EDGE_KINDS], source: '@spacegraphjs/filesystem' },
    ],
    build: buildFileSystemView,
    vocabulary: filesystemVocabulary,
});
