import { describe, it, expect } from 'vitest';
import type { GraphViewData, GraphNode, GraphFacets } from '@spacegraphjs/shared';
import {
    search,
    searchBy,
    rankedSearch,
    defaultRank,
    defaultSearchText,
    sessionOutline,
    facetCounts,
} from './search';
import {
    navigationHelp,
    parseNavigation,
    navigationTargets,
    navigationResults,
    nextNavigationTarget,
    NAVIGATION_MNEMONICS,
} from './navigation';

function createMockNode(overrides: Partial<GraphNode> = {}): GraphNode {
    return {
        id: 'test-node',
        label: 'Test Node',
        kind: 'message',
        status: 'completed',
        summary: 'Test summary',
        data: {},
        interactive: true,
        ...overrides,
    };
}

function createMockModel(overrides: Partial<GraphViewData> = {}): GraphViewData {
    return {
        nodes: [],
        edges: [],
        facets: { kinds: new Set(), statuses: new Set(), domains: new Set() },
        turns: [],
        ...overrides,
    };
}

describe('search', () => {
    it('delegates to provided search function', () => {
        const model = createMockModel({ nodes: [createMockNode({ id: '1', label: 'Node 1' })] });
        const searchFn = (m: GraphViewData, q: string) =>
            m.nodes.filter((n) => n.label.includes(q));
        const results = search(model, 'Node 1', searchFn);
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('1');
    });
});

describe('searchBy', () => {
    it('returns empty array for empty query', () => {
        const model = createMockModel({ nodes: [createMockNode({ id: '1', label: 'Test' })] });
        const results = searchBy(model, '  ', (n) => 0);
        expect(results).toEqual([]);
    });

    it('sorts by score then by index', () => {
        const model = createMockModel({
            nodes: [
                createMockNode({ id: '1', label: 'A' }),
                createMockNode({ id: '2', label: 'B' }),
                createMockNode({ id: '3', label: 'A' }),
            ],
        });
        const results = searchBy(model, 'x', (node) => (node.label === 'A' ? 0 : 1));
        expect(results.map((n) => n.id)).toEqual(['1', '3', '2']);
    });

    it('excludes nodes with negative score', () => {
        const model = createMockModel({
            nodes: [
                createMockNode({ id: '1', label: 'Match' }),
                createMockNode({ id: '2', label: 'NoMatch' }),
            ],
        });
        const results = searchBy(model, 'x', (node) => (node.label === 'Match' ? 0 : -1));
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('1');
    });
});

describe('defaultRank', () => {
    it('returns 0 for label prefix match', () => {
        const node = createMockNode({ label: 'TestNode' });
        expect(defaultRank(node, 'test')).toBe(0);
    });

    it('returns 1 for label contains match', () => {
        const node = createMockNode({ label: 'MyTestNode' });
        expect(defaultRank(node, 'test')).toBe(1);
    });

    it('returns 2 for name contains match', () => {
        const node = createMockNode({ label: 'Other', data: { name: 'test-file' } });
        expect(defaultRank(node, 'test')).toBe(2);
    });

    it('returns 3 for path contains match', () => {
        const node = createMockNode({ label: 'Other', data: { path: '/src/test/file.ts' } });
        expect(defaultRank(node, 'test')).toBe(3);
    });

    it('returns 4 for body contains match', () => {
        const node = createMockNode({ label: 'Other', summary: 'this is a test' });
        expect(defaultRank(node, 'test')).toBe(4);
    });

    it('returns -1 for no match', () => {
        const node = createMockNode({ label: 'Other', summary: 'nothing here' });
        expect(defaultRank(node, 'test')).toBe(-1);
    });
});

describe('defaultSearchText', () => {
    it('extracts label, summary, and data fields', () => {
        const node = createMockNode({
            label: 'My Label',
            summary: 'My Summary',
            data: { name: 'my-name', path: '/my/path', command: 'my-cmd' },
        });
        const texts = defaultSearchText(node);
        expect(texts).toContain('My Label');
        expect(texts).toContain('My Summary');
        expect(texts).toContain('my-name');
        expect(texts).toContain('/my/path');
        expect(texts).toContain('my-cmd');
    });

    it('filters out undefined values', () => {
        const node = createMockNode({ label: 'Label', summary: '', data: {} });
        const texts = defaultSearchText(node);
        expect(texts).toEqual(['Label']);
    });
});

describe('rankedSearch', () => {
    it('uses defaultRank internally', () => {
        const model = createMockModel({
            nodes: [
                createMockNode({ id: '1', label: 'Test Node', summary: '' }),
                createMockNode({ id: '2', label: 'Other', summary: '' }),
            ],
        });
        const results = rankedSearch(model, 'test');
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('1');
    });
});

describe('sessionOutline', () => {
    it('returns empty array for no turns', () => {
        const model = createMockModel({ turns: [] });
        expect(sessionOutline(model)).toEqual([]);
    });

    it('builds outline with turn numbers and phases', () => {
        const turn1 = createMockNode({ id: 'turn1', label: 'Turn 1', kind: 'turn' });
        const turn2 = createMockNode({ id: 'turn2', label: 'Turn 2', kind: 'turn' });
        const phase1 = createMockNode({
            id: 'phase1',
            label: 'Phase 1',
            kind: 'phase',
            data: { category: 'tool' },
        });
        const phase2 = createMockNode({
            id: 'phase2',
            label: 'Phase 2',
            kind: 'phase',
            data: { category: 'thinking' },
        });

        const model = createMockModel({
            nodes: [turn1, turn2, phase1, phase2],
            edges: [
                { id: 'e1', source: 'turn1', target: 'phase1', kind: 'part-of' },
                { id: 'e2', source: 'turn2', target: 'phase2', kind: 'part-of' },
            ],
            turns: ['turn1', 'turn2'],
        });

        const outline = sessionOutline(model);
        expect(outline).toHaveLength(2);
        expect(outline[0].turnLabel).toBe('Turn 1');
        expect(outline[0].phases).toHaveLength(1);
        expect(outline[0].phases[0].label).toBe('Phase 1');
        expect(outline[1].turnLabel).toBe('Turn 2');
        expect(outline[1].phases[0].label).toBe('Phase 2');
    });

    it('handles missing turn nodes gracefully', () => {
        const model = createMockModel({
            nodes: [],
            edges: [],
            turns: ['missing-turn'],
        });
        const outline = sessionOutline(model);
        expect(outline).toHaveLength(1);
        expect(outline[0].turnLabel).toBe('Turn 1');
        expect(outline[0].phases).toEqual([]);
    });
});

describe('facetCounts', () => {
    it('counts kinds, statuses, and domains', () => {
        const node1 = createMockNode({
            id: '1',
            kind: 'message',
            status: 'completed',
            data: { domain: 'code' },
        });
        const node2 = createMockNode({
            id: '2',
            kind: 'message',
            status: 'pending',
            data: { domain: 'code' },
        });
        const node3 = createMockNode({
            id: '3',
            kind: 'file',
            status: 'completed',
            data: { domain: 'test' },
        });

        const model = createMockModel({
            nodes: [node1, node2, node3],
            facets: {
                kinds: new Set(['message', 'file']),
                statuses: new Set(['completed', 'pending']),
                domains: new Set(['code', 'test']),
            },
        });

        const counts = facetCounts(model, model.facets);
        expect(counts.kinds).toEqual([
            { value: 'message', kept: 2, total: 2 },
            { value: 'file', kept: 1, total: 1 },
        ]);
        expect(counts.statuses).toEqual([
            { value: 'completed', kept: 2, total: 2 },
            { value: 'pending', kept: 1, total: 1 },
        ]);
        expect(counts.domains).toEqual([
            { value: 'code', kept: 2, total: 2 },
            { value: 'test', kept: 1, total: 1 },
        ]);
    });

    it('respects facet filters', () => {
        const node1 = createMockNode({
            id: '1',
            kind: 'message',
            status: 'completed',
            data: { domain: 'code' },
        });
        const node2 = createMockNode({
            id: '2',
            kind: 'file',
            status: 'pending',
            data: { domain: 'test' },
        });

        const model = createMockModel({
            nodes: [node1, node2],
            facets: {
                kinds: new Set(['message']),
                statuses: new Set(['completed']),
                domains: new Set(['code']),
            },
        });

        const counts = facetCounts(model, model.facets);
        expect(counts.kinds).toEqual([{ value: 'message', kept: 1, total: 1 }]);
        expect(counts.statuses).toEqual([{ value: 'completed', kept: 1, total: 1 }]);
        expect(counts.domains).toEqual([{ value: 'code', kept: 1, total: 1 }]);
    });
});

describe('navigation functions', () => {
    it('navigationHelp returns all mnemonics', () => {
        const help = navigationHelp();
        expect(help).toHaveLength(NAVIGATION_MNEMONICS.length);
        expect(help[0]).toEqual({ key: 's', labelKey: 'ui.search.nav.session' });
    });

    it("parseNavigation parses valid 'g X' queries", () => {
        expect(parseNavigation('g t')).toEqual({
            key: 't',
            labelKey: 'ui.search.nav.turn',
            kinds: ['turn'],
        });
        expect(parseNavigation('G T')).toEqual({
            key: 't',
            labelKey: 'ui.search.nav.turn',
            kinds: ['turn'],
        });
        expect(parseNavigation('g  s  ')).toEqual({
            key: 's',
            labelKey: 'ui.search.nav.session',
            kinds: ['session'],
        });
    });

    it('parseNavigation returns undefined for invalid queries', () => {
        expect(parseNavigation('x t')).toBeUndefined();
        expect(parseNavigation('g')).toBeUndefined();
        expect(parseNavigation('g x')).toBeUndefined();
    });

    it('navigationTargets filters nodes by kind', () => {
        const model = createMockModel({
            nodes: [
                createMockNode({ id: '1', kind: 'turn' }),
                createMockNode({ id: '2', kind: 'message' }),
                createMockNode({ id: '3', kind: 'turn' }),
            ],
        });
        const targets = navigationTargets(model, { key: 't', labelKey: 'test', kinds: ['turn'] });
        expect(targets.map((n) => n.id)).toEqual(['1', '3']);
    });

    it('navigationResults returns undefined for non-navigation queries', () => {
        const model = createMockModel({ nodes: [createMockNode({ id: '1' })] });
        expect(navigationResults(model, 'search query')).toBeUndefined();
    });

    it('navigationResults returns targets for navigation queries', () => {
        const model = createMockModel({
            nodes: [
                createMockNode({ id: '1', kind: 'turn' }),
                createMockNode({ id: '2', kind: 'message' }),
            ],
        });
        const results = navigationResults(model, 'g t');
        expect(results?.map((n) => n.id)).toEqual(['1']);
    });

    it('nextNavigationTarget cycles through targets', () => {
        const model = createMockModel({
            nodes: [
                createMockNode({ id: '1', kind: 'turn' }),
                createMockNode({ id: '2', kind: 'turn' }),
                createMockNode({ id: '3', kind: 'turn' }),
            ],
        });
        const mnemonic = { key: 't', labelKey: 'test', kinds: ['turn'] as const };
        expect(nextNavigationTarget(model, mnemonic, undefined)?.id).toBe('1');
        expect(nextNavigationTarget(model, mnemonic, '1')?.id).toBe('2');
        expect(nextNavigationTarget(model, mnemonic, '2')?.id).toBe('3');
        expect(nextNavigationTarget(model, mnemonic, '3')?.id).toBe('1');
    });

    it('nextNavigationTarget returns undefined for empty targets', () => {
        const model = createMockModel({ nodes: [] });
        const mnemonic = { key: 't', labelKey: 'test', kinds: ['turn'] as const };
        expect(nextNavigationTarget(model, mnemonic)).toBeUndefined();
    });
});
