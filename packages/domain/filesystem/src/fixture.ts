import { foldKernelOps, type KernelOp } from '@spacegraphjs/kernel';
import { ModelAdapter } from '@spacegraphjs/adapter';
import type { RenderEdge, RenderNode, NodeStatus } from '@spacegraphjs/renderer';
import type { GraphEdge, GraphNode } from '@spacegraphjs/shared';
import { FilesystemEventMapper, type FilesystemEvent } from './mapping';
import { roleOf, type FileSystemView } from './vocabulary';

export type FilesystemLevel = 'overview' | 'execution' | 'detail';

const fid = (...parts: string[]): string => ['filesystem', ...parts].join(':');

/** A canonical provider-free commit containing a change, a symbol dependency and an artifact. */
export const fixtureEvents = (): readonly FilesystemEvent[] => [
    { type: 'commit', commitId: 'c1', message: 'refactor auth', at: 1 },
    { type: 'file', commitId: 'c1', path: 'src/auth/session.ts', id: 'session', at: 2 },
    {
        type: 'symbol',
        commitId: 'c1',
        path: 'src/auth/session.ts',
        fileId: 'session',
        name: 'refresh',
        id: 'refresh',
        symbolKind: 'function',
        at: 3,
    },
    {
        type: 'symbol',
        commitId: 'c1',
        path: 'src/auth/session.ts',
        fileId: 'session',
        name: 'verify',
        id: 'verify',
        symbolKind: 'function',
        at: 4,
    },
    {
        type: 'change',
        commitId: 'c1',
        path: 'src/auth/session.ts',
        fileId: 'session',
        id: 'edit',
        producerId: 'refresh',
        lines: 12,
        status: 'active',
        at: 5,
    },
    {
        type: 'artifact',
        commitId: 'c1',
        path: 'dist/auth.js',
        id: 'bundle',
        producerId: 'edit',
        at: 6,
    },
];

export const foldFilesystemOps = foldKernelOps;

/** Host-level facts the event stream does not carry: an explicit dependency and change order. */
export function fixtureOps(): readonly KernelOp[] {
    const mapper = new FilesystemEventMapper();
    const extra: KernelOp[] = [
        {
            op: 'add-edge',
            edge: {
                id: 'depends:refresh:verify',
                kind: 'depends',
                source: fid('c1', 'refresh'),
                target: fid('c1', 'verify'),
            },
        },
        {
            op: 'add-edge',
            edge: {
                id: 'orders:session:bundle',
                kind: 'orders',
                source: fid('c1', 'session'),
                target: fid('c1', 'bundle'),
            },
        },
    ];
    return [...fixtureEvents().flatMap((event) => mapper.map(event)), ...extra];
}

export class FileSystemAdapter extends ModelAdapter<
    GraphNode,
    GraphEdge,
    FilesystemLevel,
    FileSystemView
> {
    nodeShape(node: GraphNode): RenderNode['shape'] {
        const role = roleOf(node);
        return role === 'change' || role === 'symbol' ? 'card' : 'panel';
    }

    nodeStatus(node: GraphNode): NodeStatus {
        if (node.status === 'failed') return 'error';
        if (node.status === 'active') return 'running';
        return 'success';
    }

    isStructuralKind(kind: GraphNode['kind']): boolean {
        return kind === 'commit' || kind === 'file';
    }

    nodeData(node: GraphNode, level: FilesystemLevel, dimmed: boolean): Record<string, unknown> {
        return { level, dimmed, kind: node.kind, role: roleOf(node) };
    }

    toRenderEdge(edge: GraphEdge, _level: FilesystemLevel): RenderEdge {
        return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
            visible: true,
        };
    }
}

export const FIXTURE_POSITIONS = new Map<string, { x: number; y: number; z: number }>([
    [fid('c1', 'commit'), { x: 0, y: 0, z: 0 }],
    [fid('c1', 'session'), { x: 200, y: 0, z: 0 }],
    [fid('c1', 'refresh'), { x: 400, y: -120, z: 0 }],
    [fid('c1', 'verify'), { x: 400, y: 120, z: 0 }],
    [fid('c1', 'edit'), { x: 600, y: 0, z: 0 }],
    [fid('c1', 'bundle'), { x: 800, y: 0, z: 0 }],
]);

export const filesystemAdapter = new FileSystemAdapter({
    cardBudget: 8,
    neighbors: (_view, id) =>
        id === fid('c1', 'edit') ? [fid('c1', 'refresh'), fid('c1', 'session')] : [],
});
