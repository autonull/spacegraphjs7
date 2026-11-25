import { describe, expect, it } from 'vitest';
import { layoutGraph, turnSubgraph, type GraphViewData } from './types';
const node = (id: string) => ({ id, kind: 'action', label: id, status: 'success' });
const edge = (source: string, target: string) => ({
    id: `${source}-${target}`,
    source,
    target,
    kind: 'orders',
});
const model: GraphViewData = {
    nodes: [node('turn'), node('a'), node('b'), node('c')],
    edges: [edge('turn', 'a'), edge('turn', 'b'), edge('a', 'c')],
};
describe('turnSubgraph', () => {
    it('returns the turn and its recorded neighbours in model order', () => {
        const result = turnSubgraph(model, 'turn', 3);
        expect(result.nodes.map((entry) => entry.id)).toEqual(['turn', 'a', 'b']);
        expect(result.edges.map((entry) => entry.id)).toEqual(['turn-a', 'turn-b']);
    });
    it('returns nothing for an unknown turn', () => {
        expect(turnSubgraph(model, 'missing', 5)).toEqual({ nodes: [], edges: [] });
    });
});
describe('layoutGraph', () => {
    it('places children one level below their parent and centres each level', () => {
        const { positions } = layoutGraph(model, { level: 'execution' });
        expect(positions.get('turn')).toEqual({ x: 0, y: 0 });
        expect(positions.get('a')?.y).toBe(120);
        expect(positions.get('b')?.y).toBe(120);
        expect(positions.get('c')?.y).toBe(240);
        expect(positions.get('a')?.x).toBe(-90);
        expect(positions.get('b')?.x).toBe(90);
    });
    it('widens detail spacing', () => {
        const { positions } = layoutGraph(model, { level: 'detail' });
        expect(positions.get('a')?.x).toBe(-120);
    });
});
