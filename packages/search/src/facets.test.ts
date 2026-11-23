import { describe, it, expect } from 'vitest';
import { createMockNode, createMockModel } from './test-fixtures';
import type { GraphViewData, GraphFacets } from '@spacegraphjs/shared';
import {
    applyFacets,
    keepOnly,
    composeScopes,
    facetCounts,
    facetsToQuery,
    facetsFromQuery,
    hasFacets,
    type FacetAccessors,
} from './facets';

const knownKinds = ['session', 'turn', 'message', 'tool', 'file', 'error'] as const;
const knownStatuses = ['pending', 'running', 'completed', 'failed', 'interrupted'] as const;
const knownDomains = ['session', 'code', 'test', 'config'] as const;

const accessors: FacetAccessors = {
    kind: (node) => node.kind,
    status: (node) => node.status,
    domain: (node) => node.data?.domain as string | undefined,
    rootId: (model) => model.nodes[0]?.id ?? 'root',
};

const mockCollapseGroups = (model: GraphViewData, collapsed: ReadonlySet<string>): GraphViewData => {
    // Simple mock - just filter out collapsed groups
    const collapsedIds = new Set(collapsed);
    return {
        ...model,
        nodes: model.nodes.filter((n) => !collapsedIds.has(n.id)),
        edges: model.edges.filter((e) => !collapsedIds.has(e.source) && !collapsedIds.has(e.target)),
    };
};

describe('facets', () => {
    describe('applyFacets', () => {
        it('returns all nodes when facets are empty', () => {
            const root = createMockNode({ id: 'root', label: 'Root', kind: 'session' });
            const node1 = createMockNode({ id: '1', label: 'Node 1', kind: 'message' });
            const node2 = createMockNode({ id: '2', label: 'Node 2', kind: 'tool' });
            const model = createMockModel({ nodes: [root, node1, node2] });

            const facets: GraphFacets = { query: '', kinds: new Set(), statuses: new Set(), domains: new Set() };
            const result = applyFacets({ model, facets, accessors });

            expect(result.nodes).toHaveLength(3);
        });

        it('filters by kind', () => {
            const root = createMockNode({ id: 'root', label: 'Root', kind: 'session' });
            const node1 = createMockNode({ id: '1', label: 'Message', kind: 'message' });
            const node2 = createMockNode({ id: '2', label: 'Tool', kind: 'tool' });
            const model = createMockModel({ nodes: [root, node1, node2] });

            const facets: GraphFacets = { query: '', kinds: new Set(['tool']), statuses: new Set(), domains: new Set() };
            const result = applyFacets({ model, facets, accessors });

            // Root is always kept + the matching node
            expect(result.nodes).toHaveLength(2);
            expect(result.nodes.map((n) => n.id).sort()).toEqual(['2', 'root']);
        });

        it('filters by status', () => {
            const root = createMockNode({ id: 'root', label: 'Root', kind: 'session' });
            const node1 = createMockNode({ id: '1', label: 'Success', status: 'completed' });
            const node2 = createMockNode({ id: '2', label: 'Failed', status: 'failed' });
            const model = createMockModel({ nodes: [root, node1, node2] });

            const facets: GraphFacets = { query: '', kinds: new Set(), statuses: new Set(['failed']), domains: new Set() };
            const result = applyFacets({ model, facets, accessors });

            // Root is always kept + the matching node
            expect(result.nodes).toHaveLength(2);
            expect(result.nodes.map((n) => n.id).sort()).toEqual(['2', 'root']);
        });

        it('filters by query text', () => {
            const node1 = createMockNode({ id: '1', label: 'Auth Token', summary: '' });
            const node2 = createMockNode({ id: '2', label: 'Other', summary: '' });
            const model = createMockModel({ nodes: [node1, node2] });

            const facets: GraphFacets = { query: 'auth', kinds: new Set(), statuses: new Set(), domains: new Set() };
            const result = applyFacets({ model, facets, accessors });

            expect(result.nodes).toHaveLength(1);
            expect(result.nodes[0].id).toBe('1');
        });

        it('filters by domain', () => {
            const node1 = createMockNode({ id: '1', label: 'Code', data: { domain: 'code' } });
            const node2 = createMockNode({ id: '2', label: 'Test', data: { domain: 'test' } });
            const model = createMockModel({ nodes: [node1, node2] });

            const facets: GraphFacets = { query: '', kinds: new Set(), statuses: new Set(), domains: new Set(['code']) };
            const result = applyFacets({ model, facets, accessors });

            expect(result.nodes).toHaveLength(1);
            expect(result.nodes[0].id).toBe('1');
        });

        it('always keeps the root node', () => {
            const root = createMockNode({ id: 'root', label: 'Root', kind: 'session' });
            const node1 = createMockNode({ id: '1', label: 'Tool', kind: 'tool' });
            const model = createMockModel({ nodes: [root, node1] });

            const facets: GraphFacets = { query: '', kinds: new Set(['file']), statuses: new Set(), domains: new Set() };
            const result = applyFacets({ model, facets, accessors });

            expect(result.nodes).toHaveLength(1);
            expect(result.nodes[0].id).toBe('root');
        });

        it('composes multiple facets', () => {
            const node1 = createMockNode({
                id: '1',
                label: 'Auth Tool',
                kind: 'tool',
                status: 'completed',
                data: { domain: 'code' },
            });
            const node2 = createMockNode({
                id: '2',
                label: 'Test Tool',
                kind: 'tool',
                status: 'failed',
                data: { domain: 'test' },
            });
            const model = createMockModel({ nodes: [node1, node2] });

            const facets: GraphFacets = {
                query: 'auth',
                kinds: new Set(['tool']),
                statuses: new Set(['completed']),
                domains: new Set(['code']),
            };
            const result = applyFacets({ model, facets, accessors });

            expect(result.nodes).toHaveLength(1);
            expect(result.nodes[0].id).toBe('1');
        });
    });

    describe('keepOnly', () => {
        it('keeps only specified IDs and root', () => {
            const root = createMockNode({ id: 'root', label: 'Root', kind: 'session' });
            const node1 = createMockNode({ id: '1', label: 'Node 1' });
            const node2 = createMockNode({ id: '2', label: 'Node 2' });
            const model = createMockModel({ nodes: [root, node1, node2] });

            const result = keepOnly({ model, ids: ['1'], accessors });

            expect(result.nodes).toHaveLength(2);
            expect(result.nodes.map((n) => n.id).sort()).toEqual(['1', 'root']);
        });

        it('keeps root even if not in IDs', () => {
            const root = createMockNode({ id: 'root', label: 'Root', kind: 'session' });
            const node1 = createMockNode({ id: '1', label: 'Node 1' });
            const model = createMockModel({ nodes: [root, node1] });

            const result = keepOnly({ model, ids: [], accessors });

            expect(result.nodes).toHaveLength(1);
            expect(result.nodes[0].id).toBe('root');
        });
    });

    describe('composeScopes', () => {
        it('applies facets then keepOnly then collapseGroups', () => {
            const root = createMockNode({ id: 'root', label: 'Root', kind: 'session' });
            const node1 = createMockNode({ id: '1', label: 'Tool', kind: 'tool', status: 'completed' });
            const node2 = createMockNode({ id: '2', label: 'File', kind: 'file', status: 'completed' });
            const model = createMockModel({ nodes: [root, node1, node2] });

            const facets: GraphFacets = { query: '', kinds: new Set(['tool']), statuses: new Set(), domains: new Set() };
            const keptIds = new Set(['1']);
            const collapsedGroups = new Set<string>();

            const result = composeScopes({
                model,
                facets,
                keptIds,
                collapsedGroups,
                accessors,
                collapseGroups: mockCollapseGroups,
            });

            // Should have root + tool (kept by facets) + kept by keepOnly
            expect(result.nodes.map((n) => n.id).sort()).toEqual(['1', 'root']);
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
                kind: 'tool',
                status: 'completed',
                data: { domain: 'test' },
            });

            const model = createMockModel({
                nodes: [node1, node2, node3],
                facets: {
                    kinds: new Set(['message', 'tool']),
                    statuses: new Set(['completed', 'pending']),
                    domains: new Set(['code', 'test']),
                },
            });

            const facets: GraphFacets = {
                query: '',
                kinds: new Set(['message', 'tool']),
                statuses: new Set(['completed', 'pending']),
                domains: new Set(['code', 'test']),
            };

            const counts = facetCounts(model, facets, accessors, knownKinds, knownStatuses, knownDomains);

            expect(counts.kinds).toEqual([
                { value: 'session', kept: 0, total: 0 },
                { value: 'turn', kept: 0, total: 0 },
                { value: 'message', kept: 2, total: 2 },
                { value: 'tool', kept: 1, total: 1 },
                { value: 'file', kept: 0, total: 0 },
                { value: 'error', kept: 0, total: 0 },
            ]);
        });
    });

    describe('facetsToQuery', () => {
        it('serializes empty facets to default domain', () => {
            const facets: GraphFacets = { query: '', kinds: new Set(), statuses: new Set(), domains: new Set(['session']) };
            const query = facetsToQuery(facets, knownKinds, knownStatuses, knownDomains);
            expect(query).toBe('domain:session');
        });

        it('serializes query text', () => {
            const facets: GraphFacets = { query: 'auth token', kinds: new Set(), statuses: new Set(), domains: new Set(['session']) };
            const query = facetsToQuery(facets, knownKinds, knownStatuses, knownDomains);
            expect(query).toBe('auth token domain:session');
        });

        it('serializes kinds in canonical order', () => {
            const facets: GraphFacets = { query: '', kinds: new Set(['file', 'tool']), statuses: new Set(), domains: new Set(['session']) };
            const query = facetsToQuery(facets, knownKinds, knownStatuses, knownDomains);
            expect(query).toBe('kind:tool,file domain:session');
        });

        it('serializes statuses in canonical order', () => {
            const facets: GraphFacets = { query: '', kinds: new Set(), statuses: new Set(['failed', 'pending']), domains: new Set(['session']) };
            const query = facetsToQuery(facets, knownKinds, knownStatuses, knownDomains);
            expect(query).toBe('status:pending,failed domain:session');
        });

        it('serializes domains in canonical order', () => {
            const facets: GraphFacets = { query: '', kinds: new Set(), statuses: new Set(), domains: new Set(['test', 'code']) };
            const query = facetsToQuery(facets, knownKinds, knownStatuses, knownDomains);
            expect(query).toBe('domain:code,test');
        });
    });

    describe('facetsFromQuery', () => {
        it('parses empty query to defaults', () => {
            const facets = facetsFromQuery('', knownKinds, knownStatuses, knownDomains);
            expect(facets.query).toBe('');
            expect(facets.kinds.size).toBe(0);
            expect(facets.statuses.size).toBe(0);
            expect(facets.domains).toEqual(new Set(['session']));
        });

        it('parses query text', () => {
            const facets = facetsFromQuery('auth token', knownKinds, knownStatuses, knownDomains);
            expect(facets.query).toBe('auth token');
            expect(facets.domains).toEqual(new Set(['session']));
        });

        it('parses kind facet', () => {
            const facets = facetsFromQuery('kind:tool,file', knownKinds, knownStatuses, knownDomains);
            expect(facets.kinds).toEqual(new Set(['tool', 'file']));
            expect(facets.domains).toEqual(new Set(['session']));
        });

        it('parses status facet', () => {
            const facets = facetsFromQuery('status:failed', knownKinds, knownStatuses, knownDomains);
            expect(facets.statuses).toEqual(new Set(['failed']));
            expect(facets.domains).toEqual(new Set(['session']));
        });

        it('parses domain facet', () => {
            const facets = facetsFromQuery('domain:code,test', knownKinds, knownStatuses, knownDomains);
            // Default domain 'session' is always included
            expect(facets.domains).toEqual(new Set(['session', 'code', 'test']));
        });

        it('ignores unknown values', () => {
            const facets = facetsFromQuery('kind:unknown status:invalid domain:fake', knownKinds, knownStatuses, knownDomains);
            expect(facets.kinds.size).toBe(0);
            expect(facets.statuses.size).toBe(0);
            // Default domain 'session' is always included
            expect(facets.domains).toEqual(new Set(['session']));
        });

        it('parses combined query', () => {
            const facets = facetsFromQuery('auth kind:tool status:failed domain:code', knownKinds, knownStatuses, knownDomains);
            expect(facets.query).toBe('auth');
            expect(facets.kinds).toEqual(new Set(['tool']));
            expect(facets.statuses).toEqual(new Set(['failed']));
            // Default domain 'session' is always included
            expect(facets.domains).toEqual(new Set(['session', 'code']));
        });

        it('round-trips with facetsToQuery', () => {
            const original: GraphFacets = {
                query: 'auth',
                kinds: new Set(['tool']),
                statuses: new Set(['failed']),
                domains: new Set(['session', 'code']), // Include default session domain
            };
            const query = facetsToQuery(original, knownKinds, knownStatuses, knownDomains);
            const parsed = facetsFromQuery(query, knownKinds, knownStatuses, knownDomains);
            expect(parsed.query).toBe(original.query);
            expect(parsed.kinds).toEqual(original.kinds);
            expect(parsed.statuses).toEqual(original.statuses);
            expect(parsed.domains).toEqual(original.domains);
        });
    });

    describe('hasFacets', () => {
        it('returns false for empty facets', () => {
            const facets: GraphFacets = { query: '', kinds: new Set(), statuses: new Set(), domains: new Set(['session']) };
            expect(hasFacets(facets)).toBe(false);
        });

        it('returns true for query text', () => {
            const facets: GraphFacets = { query: 'auth', kinds: new Set(), statuses: new Set(), domains: new Set(['session']) };
            expect(hasFacets(facets)).toBe(true);
        });

        it('returns true for kinds', () => {
            const facets: GraphFacets = { query: '', kinds: new Set(['tool']), statuses: new Set(), domains: new Set(['session']) };
            expect(hasFacets(facets)).toBe(true);
        });

        it('returns true for statuses', () => {
            const facets: GraphFacets = { query: '', kinds: new Set(), statuses: new Set(['failed']), domains: new Set(['session']) };
            expect(hasFacets(facets)).toBe(true);
        });

        it('returns true for semantic quick filters', () => {
            const facets: GraphFacets = { query: '', kinds: new Set(), statuses: new Set(), domains: new Set(['session']), errors: true };
            expect(hasFacets(facets)).toBe(true);
        });
    });

    describe('semantic quick filters (RW-01)', () => {
        const semanticAccessors: FacetAccessors = {
            ...accessors,
            isFailedTool: (node) => node.kind === 'tool' && node.status === 'failed',
            isError: (node) => node.kind === 'error',
            isSubagentCall: (node) => node.kind === 'subagent',
        };
        const root = createMockNode({ id: 'root', kind: 'session' });
        const failedTool = createMockNode({ id: 'tool', kind: 'tool', status: 'failed' });
        const error = createMockNode({ id: 'error', kind: 'error' });
        const subagent = createMockNode({ id: 'sub', kind: 'subagent' });
        const model = createMockModel({ nodes: [root, failedTool, error, subagent] });
        const empty = { query: '', kinds: new Set<string>(), statuses: new Set<string>(), domains: new Set<string>() };
        const ids = (facets: GraphFacets) =>
            applyFacets({ model, facets, accessors: semanticAccessors }).nodes.map((n) => n.id).sort();

        it('keeps all nodes when no filter is active', () => {
            expect(ids(empty)).toEqual(['error', 'root', 'sub', 'tool']);
        });

        it('narrows to a single active semantic filter', () => {
            expect(ids({ ...empty, errors: true })).toEqual(['error', 'root']);
        });

        it('OR mode keeps a node matching any active semantic filter', () => {
            expect(ids({ ...empty, failedTools: true, errors: true, composeMode: 'or' })).toEqual(['error', 'root', 'tool']);
        });

        it('AND mode keeps only nodes matching every active semantic filter', () => {
            expect(ids({ ...empty, failedTools: true, errors: true, composeMode: 'and' })).toEqual(['root']);
        });

        it('composes standard and semantic filters with AND', () => {
            expect(ids({ ...empty, kinds: new Set(['tool']), errors: true })).toEqual(['root']);
        });

        it('round-trips semantic flags and compose mode through the query grammar', () => {
            const original: GraphFacets = { ...empty, errors: true, composeMode: 'and' };
            const query = facetsToQuery(original, knownKinds, knownStatuses, knownDomains);
            const parsed = facetsFromQuery(query, knownKinds, knownStatuses, knownDomains);
            expect(parsed.errors).toBe(true);
            expect(parsed.composeMode).toBe('and');
        });
    });
});