import type { GraphFacets, GraphNode, GraphViewData } from '@spacegraphjs/shared';

export type MockModel = GraphViewData & { facets: GraphFacets };

export function createMockNode(overrides: Partial<GraphNode> = {}): GraphNode {
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

export function createMockModel(overrides: Partial<MockModel> = {}): MockModel {
    return {
        nodes: [],
        edges: [],
        facets: { query: '', kinds: new Set(), statuses: new Set(), domains: new Set() },
        turns: [],
        ...overrides,
    };
}
