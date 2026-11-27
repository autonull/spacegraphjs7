import { describe, expect, test } from 'vitest';
import {
    buildSourceView,
    fixtureOps,
    foldSourceOps,
    sourceID,
    type SourceSnapshot,
} from '@spacegraphjs/source';
import {
    capGraph,
    filterSnapshot,
    publicFileIDs,
    shortLabels,
    sourceFacts,
    symbolFacts,
} from '../src/source-browser';

const snapshot: SourceSnapshot = {
    id: 'test',
    files: [
        {
            id: 'src/index',
            path: 'src/index.ts',
            packageId: 'spacegraphjs',
            symbols: [],
            imports: [
                { specifier: './graph', fileId: 'src/graph', names: ['Graph'], kind: 'export' },
            ],
        },
        {
            id: 'src/graph',
            path: 'src/graph.ts',
            packageId: 'spacegraphjs',
            symbols: [
                {
                    name: 'Graph',
                    kind: 'class',
                    fileId: 'src/graph',
                    line: 4,
                    signature: 'export class Graph',
                },
            ],
            imports: [],
        },
        {
            id: 'packages/x/src/internal',
            path: 'packages/x/src/internal.ts',
            packageId: '@spacegraphjs/x',
            symbols: [
                {
                    name: 'internal',
                    kind: 'function',
                    fileId: 'packages/x/src/internal',
                    line: 2,
                    signature: 'function internal()',
                },
            ],
            imports: [],
        },
    ],
};

const view = buildSourceView(foldSourceOps(fixtureOps(snapshot)), snapshot.id);

describe('source browser view model', () => {
    test('a visual cap keeps the most connected nodes and reports the truncation', () => {
        const nodes = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
        const edges = [
            { source: 'a', target: 'b' },
            { source: 'a', target: 'c' },
            { source: 'b', target: 'c' },
            { source: 'd', target: 'e' },
        ];
        const capped = capGraph(nodes, edges, { nodes: 3, edges: 2 });
        expect(capped.nodes.map((node) => node.id)).toEqual(['a', 'b', 'c']);
        expect(capped.edges.map((edge) => `${edge.source}${edge.target}`)).toEqual(['ab', 'ac']);
        expect(capped.budget).toEqual({
            totalNodes: 5,
            totalEdges: 4,
            shownNodes: 3,
            shownEdges: 2,
            truncated: true,
        });
        expect(capGraph(nodes, edges).budget.truncated).toBe(false);
    });
    test('public scope keeps only files re-exported from an index', () => {
        expect([...publicFileIDs(snapshot)].sort()).toEqual(['src/graph', 'src/index']);
        const publicView = filterSnapshot(snapshot, { scope: 'public', query: '' });
        expect(publicView.files.map((file) => file.id)).toEqual(['src/index', 'src/graph']);
    });

    test('package and text filters compose', () => {
        const filtered = filterSnapshot(snapshot, {
            scope: 'all',
            packageId: 'spacegraphjs',
            query: 'graph',
            detail: 'symbols',
        });
        expect(filtered.files.map((file) => file.id)).toEqual(['src/index', 'src/graph']);
        expect(filtered.files[1]?.symbols).toHaveLength(1);
        expect(
            filterSnapshot(snapshot, { scope: 'all', packageId: 'spacegraphjs', query: 'internal' })
                .files,
        ).toHaveLength(0);
    });

    test('a text query surfaces matching symbols in the default files view', () => {
        const filtered = filterSnapshot(snapshot, { scope: 'all', query: 'Graph' });
        expect(filtered.files.find((file) => file.id === 'src/graph')?.symbols).toHaveLength(1);
        expect(filtered.files.find((file) => file.id === 'src/index')?.symbols).toHaveLength(0);
    });
    test('short labels stay unique and keep the narrowest readable suffix', () => {
        const labels = shortLabels([
            'src/a11y/index.ts',
            'src/core/index.ts',
            'src/core/Graph.ts',
            'packages/x/src/internal.ts',
        ]);
        expect([...labels.values()]).toEqual([
            'a11y/index.ts',
            'core/index.ts',
            'Graph.ts',
            'internal.ts',
        ]);
    });
    test('facts count files, symbols and packages from the filtered snapshot', () => {
        const facts = sourceFacts(snapshot);
        expect(facts.packages.map((entry) => entry.id)).toEqual([
            '@spacegraphjs/x',
            'spacegraphjs',
        ]);
        expect(facts.files).toBe(3);
        expect(facts.symbols).toBe(2);
        expect(facts.imports).toBe(0);
    });

    test('inspector facts come from the folded view', () => {
        const facts = symbolFacts(view, sourceID('test', 'spacegraphjs', 'src/graph', 'Graph'));
        expect(facts.title).toBe('Graph');
        expect(facts.kind).toBe('class');
        expect(facts.path).toBe('src/graph.ts');
        expect(facts.line).toBe(4);
        const fileFacts = symbolFacts(view, sourceID('test', 'spacegraphjs', 'src/graph'));
        expect(fileFacts.dependents).toContain('src/index.ts');
    });

    test('an unknown id yields empty inspector facts', () => {
        expect(symbolFacts(view, 'missing').signature).toBe('');
    });
});
