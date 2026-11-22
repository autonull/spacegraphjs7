import { describe, expect, it } from 'vitest';
import {
    chooseColumns,
    orderByProximity,
    refineBySwaps,
    solveErgonomicLayout,
    type ErgonomicsEdge,
    type ErgonomicsNode,
} from '../../src/layout';

const chain = (count: number): { nodes: ErgonomicsNode[]; edges: ErgonomicsEdge[] } => ({
    nodes: Array.from({ length: count }, (_, index) => ({ id: `n${index}`, width: 180, height: 72 })),
    edges: Array.from({ length: count - 1 }, (_, index) => ({ source: `n${index}`, target: `n${index + 1}` })),
});

const wide = { width: 1600, height: 900 };
const narrow = { width: 900, height: 1000 };

describe('ergonomic layout heuristics', () => {
    it('chooses columns from the surface aspect, not from a host preset', () => {
        expect(chooseColumns(12, wide)).toBe(4);
        expect(chooseColumns(12, narrow)).toBe(3);
        expect(chooseColumns(12, wide, 2)).toBe(2);
        expect(chooseColumns(1, wide)).toBe(1);
    });

    it('starts from the busiest node and keeps every id without host semantics', () => {
        const graph = chain(6);
        const order = orderByProximity(graph.nodes, graph.edges);
        expect(new Set(order)).toEqual(new Set(graph.nodes.map((node) => node.id)));
        expect(['n1', 'n2', 'n3', 'n4']).toContain(order[0]);
    });

    it('puts the busiest node first', () => {
        const nodes: ErgonomicsNode[] = ['a', 'b', 'c', 'hub'].map((id) => ({ id }));
        const edges: ErgonomicsEdge[] = ['a', 'b', 'c'].map((id) => ({ source: 'hub', target: id }));
        expect(orderByProximity(nodes, edges)[0]).toBe('hub');
    });

    it('keeps swap refinement deterministic and bounded', () => {
        const graph = chain(8);
        const order = orderByProximity(graph.nodes, graph.edges);
        expect(refineBySwaps(order, graph.edges, 4, 2)).toEqual(refineBySwaps(order, graph.edges, 4, 2));
        expect(refineBySwaps(order, graph.edges, 4, 0)).toEqual(order);
    });

    it('fills the surface without overlap and respects the legibility floor', () => {
        const graph = chain(12);
        const layout = solveErgonomicLayout(graph.nodes, graph.edges, wide)!;
        expect(layout.positions.size).toBe(12);
        expect(layout.metrics.overlaps).toBe(0);
        expect(layout.metrics.labelFloorMet).toBe(true);
        expect(layout.metrics.occupancy).toBeGreaterThan(0.3);
        expect(layout.metrics.occupancy).toBeLessThanOrEqual(1);
        expect(layout.card[0]).toBeGreaterThanOrEqual(180);
        expect(layout.card[1]).toBeGreaterThanOrEqual(72);
    });

    it('adapts the grid to a narrow surface', () => {
        const graph = chain(12);
        const broad = solveErgonomicLayout(graph.nodes, graph.edges, wide)!;
        const tall = solveErgonomicLayout(graph.nodes, graph.edges, narrow)!;
        expect(tall.columns).toBeLessThan(broad.columns);
        expect(tall.card[0]).toBeGreaterThanOrEqual(180);
        expect(tall.metrics.overlaps).toBe(0);
    });

    it('is deterministic and returns nothing for an empty graph', () => {
        const graph = chain(9);
        const a = solveErgonomicLayout(graph.nodes, graph.edges, wide);
        const b = solveErgonomicLayout(graph.nodes, graph.edges, wide);
        expect([...a!.positions]).toEqual([...b!.positions]);
        expect(solveErgonomicLayout([], [], wide)).toBeUndefined();
        expect(solveErgonomicLayout(graph.nodes, graph.edges, { width: 0, height: 0 })).toBeUndefined();
    });
});
