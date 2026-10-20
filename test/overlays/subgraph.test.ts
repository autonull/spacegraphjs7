// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CHILD_EDGE_KIND, extractSubgraph } from '../../src/overlays';

type TestNode = { id: string; kind: string; rank?: number };
type TestEdge = { id: string; source: string; target: string; kind: string };

const MODEL = {
    nodes: [
        { id: 'session', kind: 'session' },
        { id: 'turn', kind: 'turn' },
        { id: 'phase', kind: 'phase' },
        { id: 'tool', kind: 'tool' },
        { id: 'file', kind: 'file' },
        { id: 'other', kind: 'turn' },
    ],
    edges: [
        { id: 'e1', source: 'turn', target: 'session', kind: 'part-of' },
        { id: 'e2', source: 'phase', target: 'turn', kind: 'part-of' },
        { id: 'e3', source: 'tool', target: 'turn', kind: 'part-of' },
        { id: 'e4', source: 'file', target: 'tool', kind: 'writes' },
        { id: 'e5', source: 'other', target: 'session', kind: 'part-of' },
    ],
};

describe('extractSubgraph', () => {
    it('keeps the root, its children, and the edges between them', () => {
        const scope = extractSubgraph(MODEL, 'turn', { limit: 7 });

        expect(scope.root?.id).toBe('turn');
        expect(scope.nodes.map((node) => node.id)).toEqual(['turn', 'phase', 'tool']);
        expect(scope.edges.map((edge) => edge.id)).toEqual(['e2', 'e3']);
    });

    it('drops the edges that leave the scope', () => {
        const scope = extractSubgraph(MODEL, 'turn', { limit: 7 });

        expect(scope.edges.some((edge) => edge.id === 'e4')).toBe(false);
        expect(scope.edges.some((edge) => edge.id === 'e1')).toBe(false);
    });

    it('caps the scope at the limit, the root included', () => {
        const scope = extractSubgraph(MODEL, 'turn', { limit: 2 });

        expect(scope.nodes.map((node) => node.id)).toEqual(['turn', 'phase']);
    });

    it('ranks the children and keeps the model order inside the scope', () => {
        const scope = extractSubgraph(MODEL, 'turn', { limit: 2, rankFn: (node) => (node.kind === 'tool' ? 0 : 1) });

        expect(scope.nodes.map((node) => node.id)).toEqual(['turn', 'tool']);
    });

    it('returns an empty scope for a node the model does not hold', () => {
        const scope = extractSubgraph(MODEL, 'missing');

        expect(scope.root).toBeUndefined();
        expect(scope.nodes).toEqual([]);
        expect(scope.edges).toEqual([]);
    });

    it('walks the containment edge the host names', () => {
        const scope = extractSubgraph(MODEL, 'session', { limit: 7, childEdgeKind: 'contains' });

        expect(scope.nodes.map((node) => node.id)).toEqual(['session']);

        const containment = extractSubgraph(MODEL, 'session', { limit: 7, childEdgeKind: CHILD_EDGE_KIND });

        expect(containment.nodes.map((node) => node.id)).toEqual(['session', 'turn', 'other']);
    });

    it('never returns fewer than the root', () => {
        const scope = extractSubgraph(MODEL, 'turn', { limit: 0 });

        expect(scope.nodes.map((node) => node.id)).toEqual(['turn']);
    });
});
