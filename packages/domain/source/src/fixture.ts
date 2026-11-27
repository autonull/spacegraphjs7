import { foldKernelOps, type KernelOp } from '@spacegraphjs/kernel';
import { VocabularyAdapter, type AdapterConfig } from '@spacegraphjs/adapter';
import type { GraphEdge, GraphNode } from '@spacegraphjs/shared';
import { SourceEventMapper } from './mapping';
import { snapshotEvents, type SourceSnapshot } from './snapshot';
import { roleOf, type SourceView } from './vocabulary';

export type SourceLevel = 'overview' | 'execution' | 'detail';

/** A tiny provider-free API snapshot with a re-export and a cross-package import. */
export const fixtureSnapshot = (): SourceSnapshot => ({
    id: 'fixture',
    label: 'Fixture API',
    files: [
        {
            id: 'index',
            path: 'src/index.ts',
            packageId: 'spacegraphjs',
            symbols: [{ name: 'Graph', kind: 'class', fileId: 'index', line: 3, signature: 'class Graph' }],
            imports: [
                { specifier: './core/Graph', fileId: 'core/graph', names: ['Graph'], kind: 'export' },
            ],
        },
        {
            id: 'core/graph',
            path: 'src/core/Graph.ts',
            packageId: 'spacegraphjs',
            symbols: [
                {
                    name: 'Graph',
                    kind: 'class',
                    fileId: 'core/graph',
                    line: 8,
                    signature: 'export class Graph',
                    doc: 'Owns nodes and edges.',
                },
                {
                    name: 'add',
                    kind: 'function',
                    fileId: 'core/graph',
                    line: 20,
                    signature: 'add(node: Node): this',
                    references: ['core/graph:Graph'],
                },
            ],
            imports: [],
        },
        {
            id: 'contract',
            path: 'packages/renderer/src/index.ts',
            packageId: '@spacegraphjs/renderer',
            symbols: [
                {
                    name: 'escapeHtml',
                    kind: 'function',
                    fileId: 'contract',
                    line: 12,
                    signature: 'escapeHtml(value: string): string',
                },
            ],
            imports: [
                { specifier: 'spacegraphjs', fileId: 'index', names: ['Graph'], kind: 'import' },
            ],
        },
    ],
});

export const foldSourceOps = foldKernelOps;

/** Snapshot facts become ordinary kernel ops; no scanner or host object is retained. */
export function snapshotOps(snapshot: SourceSnapshot): readonly KernelOp[] {
    const mapper = new SourceEventMapper();
    return snapshotEvents(snapshot).flatMap((event) => mapper.map(event, snapshot.id));
}

export const fixtureOps = (snapshot: SourceSnapshot = fixtureSnapshot()): readonly KernelOp[] =>
    snapshotOps(snapshot);

export class SourceAdapter extends VocabularyAdapter<
    GraphNode,
    GraphEdge,
    SourceLevel,
    SourceView
> {
    constructor(config: AdapterConfig<GraphNode, GraphEdge, SourceLevel, SourceView> = {}) {
        super(
            {
                cardRoles: ['class', 'function', 'interface', 'type', 'const', 'enum', 'namespace'],
                structuralKinds: ['package', 'file'],
                roleOf,
            },
            config,
        );
    }
}

const sid = (...parts: string[]): string => ['source', 'fixture', ...parts].join(':');

export const FIXTURE_POSITIONS = new Map<string, { x: number; y: number; z: number }>([
    [sid('spacegraphjs'), { x: 0, y: 0, z: 0 }],
    [sid('@spacegraphjs/renderer'), { x: 0, y: 400, z: 0 }],
    [sid('spacegraphjs', 'index'), { x: 220, y: -80, z: 0 }],
    [sid('spacegraphjs', 'core/graph'), { x: 220, y: 120, z: 0 }],
    [sid('@spacegraphjs/renderer', 'contract'), { x: 220, y: 400, z: 0 }],
    [sid('spacegraphjs', 'index', 'Graph'), { x: 460, y: -80, z: 0 }],
    [sid('spacegraphjs', 'core/graph', 'Graph'), { x: 460, y: 60, z: 0 }],
    [sid('spacegraphjs', 'core/graph', 'add'), { x: 460, y: 180, z: 0 }],
    [sid('@spacegraphjs/renderer', 'contract', 'escapeHtml'), { x: 460, y: 400, z: 0 }],
]);

export const sourceAdapter = new SourceAdapter({
    cardBudget: 8,
    neighbors: (_view, id) =>
        id === sid('spacegraphjs', 'core/graph', 'add')
            ? [sid('spacegraphjs', 'core/graph', 'Graph')]
            : [],
});
