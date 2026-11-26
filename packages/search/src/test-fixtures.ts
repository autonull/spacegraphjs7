import type { GraphFacets, GraphNode, GraphViewData } from '@spacegraphjs/shared';

export type MockModel = GraphViewData & { facets: GraphFacets };

export function createMockFacets(overrides: Partial<GraphFacets> = {}): GraphFacets {
    return {
        query: '',
        kinds: new Set(),
        statuses: new Set(),
        domains: new Set(),
        ...overrides,
    };
}

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
        facets: createMockFacets(),
        turns: [],
        ...overrides,
    };
}
