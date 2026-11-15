import { describe, it, expect } from 'vitest';
import { computeFocusOverlay, getFocusOpacity, isDimmed, FOCUS_OPACITY_STOPS } from './focus';
import type { GraphViewData, GraphNode, GraphEdge } from '@spacegraphjs/shared';

function createTestModel(): GraphViewData {
    const nodes: GraphNode[] = [
        { id: 'a', kind: 'node', label: 'A', status: 'active' },
        { id: 'b', kind: 'node', label: 'B', status: 'active' },
        { id: 'c', kind: 'node', label: 'C', status: 'active' },
        { id: 'd', kind: 'node', label: 'D', status: 'active' },
        { id: 'e', kind: 'node', label: 'E', status: 'active' },
        { id: 'f', kind: 'node', label: 'F', status: 'active' },
    ];

    const edges: GraphEdge[] = [
        { id: 'e1', kind: 'edge', source: 'a', target: 'b' },
        { id: 'e2', kind: 'edge', source: 'b', target: 'c' },
        { id: 'e3', kind: 'edge', source: 'c', target: 'd' },
        { id: 'e4', kind: 'edge', source: 'a', target: 'e' },
        { id: 'e5', kind: 'edge', source: 'e', target: 'f' },
    ];

    return { nodes, edges };
}

describe('computeFocusOverlay', () => {
    const model = createTestModel();

    it('returns empty map when no selection', () => {
        const overlay = computeFocusOverlay({ model, selection: [] });
        expect(overlay.size).toBe(0);
    });

    it('returns distance 0 for selected nodes', () => {
        const overlay = computeFocusOverlay({ model, selection: ['a'] });
        expect(overlay.get('a')).toBe(0);
    });

    it('computes BFS distance from selected node', () => {
        const overlay = computeFocusOverlay({ model, selection: ['a'] });
        expect(overlay.get('b')).toBe(1);
        expect(overlay.get('c')).toBe(2);
        expect(overlay.get('d')).toBe(3);
        expect(overlay.get('e')).toBe(1);
        expect(overlay.get('f')).toBe(2);
    });

    it('respects maxDistance', () => {
        const overlay = computeFocusOverlay({ model, selection: ['a'], maxDistance: 2 });
        expect(overlay.get('a')).toBe(0);
        expect(overlay.get('b')).toBe(1);
        expect(overlay.get('c')).toBe(2);
        expect(overlay.get('d')).toBeUndefined(); // Beyond maxDistance
        expect(overlay.get('e')).toBe(1);
        expect(overlay.get('f')).toBe(2);
    });

    it('handles multiple source nodes (selection + streaming)', () => {
        const overlay = computeFocusOverlay({ model, selection: ['a'], streamingNode: 'd' });
        // d is also a source at distance 0
        expect(overlay.get('d')).toBe(0);
        expect(overlay.get('c')).toBe(1); // min distance from a(2) or d(1) = 1
        expect(overlay.get('b')).toBe(1); // from a
    });

    it('traverses both incoming and outgoing edges', () => {
        // a -> b -> c (outgoing)
        // e -> a (incoming to a)
        const overlay = computeFocusOverlay({ model, selection: ['b'] });
        expect(overlay.get('b')).toBe(0);
        expect(overlay.get('a')).toBe(1); // incoming
        expect(overlay.get('c')).toBe(1); // outgoing
        expect(overlay.get('e')).toBe(2); // a -> e
    });
});

describe('getFocusOpacity', () => {
    it('returns 1.0 for distance 0', () => {
        expect(getFocusOpacity(0)).toBe(1);
    });

    it('returns correct opacity for distances 1-3', () => {
        expect(getFocusOpacity(1)).toBe(0.85);
        expect(getFocusOpacity(2)).toBe(0.6);
        expect(getFocusOpacity(3)).toBe(0.35);
    });

    it('returns minimum opacity for distance > 3', () => {
        expect(getFocusOpacity(4)).toBe(0.15);
        expect(getFocusOpacity(10)).toBe(0.15);
    });

    it('returns minimum opacity for negative distance', () => {
        expect(getFocusOpacity(-1)).toBe(1);
    });
});

describe('isDimmed', () => {
    it('returns true for undefined distance', () => {
        expect(isDimmed(undefined, 3)).toBe(true);
    });

    it('returns false for distance <= maxDistance', () => {
        expect(isDimmed(0, 3)).toBe(false);
        expect(isDimmed(3, 3)).toBe(false);
    });

    it('returns true for distance > maxDistance', () => {
        expect(isDimmed(4, 3)).toBe(true);
        expect(isDimmed(10, 3)).toBe(true);
    });
});

describe('FOCUS_OPACITY_STOPS', () => {
    it('has correct values', () => {
        expect(FOCUS_OPACITY_STOPS).toEqual([1, 0.85, 0.6, 0.35, 0.15]);
    });
});