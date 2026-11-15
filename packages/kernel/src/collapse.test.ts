import { describe, it, expect } from 'bun:test';
import { collapseGroups, isGroup, getGroupIds } from './collapse';
import type { GraphViewData, GraphNode, GraphEdge } from '@spacegraphjs/shared';

function createTestModel(): GraphViewData {
    const nodes: GraphNode[] = [
        { id: 'group1', kind: 'group', label: 'Group 1', status: 'active', clusterOf: ['a', 'b'] },
        { id: 'a', kind: 'node', label: 'A', status: 'active' },
        { id: 'b', kind: 'node', label: 'B', status: 'active' },
        { id: 'group2', kind: 'group', label: 'Group 2', status: 'active', clusterOf: ['c', 'd'] },
        { id: 'c', kind: 'node', label: 'C', status: 'active' },
        { id: 'd', kind: 'node', label: 'D', status: 'active' },
        { id: 'e', kind: 'node', label: 'E', status: 'active' }, // not in a group
    ];

    const edges: GraphEdge[] = [
        { id: 'e1', kind: 'edge', source: 'a', target: 'b' },
        { id: 'e2', kind: 'edge', source: 'c', target: 'd' },
        { id: 'e3', kind: 'edge', source: 'a', target: 'c' }, // cross-group edge
        { id: 'e4', kind: 'edge', source: 'e', target: 'a' }, // edge to member
    ];

    return { nodes, edges, turns: ['turn1'] };
}

describe('collapseGroups', () => {
    const model = createTestModel();

    it('returns original model when no groups collapsed', () => {
        const result = collapseGroups(model, new Set());
        expect(result.nodes).toEqual(model.nodes);
        expect(result.edges).toEqual(model.edges);
    });

    it('hides members of collapsed group', () => {
        const result = collapseGroups(model, new Set(['group1']));
        const nodeIds = result.nodes.map((n) => n.id);
        expect(nodeIds).toContain('group1');
        expect(nodeIds).not.toContain('a');
        expect(nodeIds).not.toContain('b');
        expect(nodeIds).toContain('group2');
        expect(nodeIds).toContain('c');
        expect(nodeIds).toContain('d');
        expect(nodeIds).toContain('e');
    });

    it('hides edges incident to hidden members', () => {
        const result = collapseGroups(model, new Set(['group1']));
        const edgeIds = result.edges.map((e) => e.id);
        // e1 (a->b) hidden because both a and b are hidden
        // e3 (a->c) hidden because a is hidden
        // e4 (e->a) hidden because a is hidden
        expect(edgeIds).not.toContain('e1');
        expect(edgeIds).not.toContain('e3');
        expect(edgeIds).not.toContain('e4');
        // e2 (c->d) visible because both c and d are visible
        expect(edgeIds).toContain('e2');
    });

    it('hides multiple collapsed groups', () => {
        const result = collapseGroups(model, new Set(['group1', 'group2']));
        const nodeIds = result.nodes.map((n) => n.id);
        expect(nodeIds).toContain('group1');
        expect(nodeIds).toContain('group2');
        expect(nodeIds).not.toContain('a');
        expect(nodeIds).not.toContain('b');
        expect(nodeIds).not.toContain('c');
        expect(nodeIds).not.toContain('d');
        expect(nodeIds).toContain('e');
    });

    it('filters turns when provided', () => {
        const modelWithTurns: GraphViewData = {
            ...model,
            turns: ['turn1', 'a', 'b'], // a and b are also turns in this test
        };
        const result = collapseGroups(modelWithTurns, new Set(['group1']));
        expect(result.turns).not.toContain('a');
        expect(result.turns).not.toContain('b');
        expect(result.turns).toContain('turn1');
    });

    it('clears activeTurn when it is hidden', () => {
        const modelWithActive: GraphViewData = { ...model, activeTurn: 'a' };
        const result = collapseGroups(modelWithActive, new Set(['group1']));
        expect(result.activeTurn).toBeUndefined();
    });

    it('keeps activeTurn when it is not hidden', () => {
        const modelWithActive: GraphViewData = { ...model, activeTurn: 'turn1' };
        const result = collapseGroups(modelWithActive, new Set(['group1']));
        expect(result.activeTurn).toBe('turn1');
    });

    it('handles group with no clusterOf', () => {
        const modelNoCluster: GraphViewData = {
            nodes: [{ id: 'group', kind: 'group', label: 'Group', status: 'active', clusterOf: [] }],
            edges: [],
        };
        const result = collapseGroups(modelNoCluster, new Set(['group']));
        expect(result.nodes.map((n) => n.id)).toEqual(['group']);
    });
});

describe('isGroup', () => {
    it('returns true for node with clusterOf', () => {
        const node: GraphNode = { id: 'g', kind: 'group', label: 'G', status: 'active', clusterOf: ['a'] };
        expect(isGroup(node)).toBe(true);
    });

    it('returns false for node without clusterOf', () => {
        const node: GraphNode = { id: 'n', kind: 'node', label: 'N', status: 'active' };
        expect(isGroup(node)).toBe(false);
    });

    it('returns false for empty clusterOf', () => {
        const node: GraphNode = { id: 'g', kind: 'group', label: 'G', status: 'active', clusterOf: [] };
        expect(isGroup(node)).toBe(false);
    });
});

describe('getGroupIds', () => {
    it('returns only group node IDs', () => {
        const model = createTestModel();
        const groupIds = getGroupIds(model);
        expect(groupIds).toEqual(['group1', 'group2']);
    });
});