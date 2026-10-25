import { describe, expect, it } from 'vitest';
import { ForcePlacement } from './barnes-hut';
import type { PlacementItem } from './placement';

describe('ForcePlacement (Barnes-Hut)', () => {
    const makeItems = (count: number): PlacementItem<{ links?: readonly string[]; radius?: number }>[] =>
        Array.from({ length: count }, (_, i) => ({
            id: `node-${i}`,
            width: 100,
            depth: 0,
            meta: {},
        }));

    it('places nodes deterministically', () => {
        const layout = new ForcePlacement({ seed: 42, iterations: 100 });
        const items = makeItems(10);

        const positions1 = layout.place(items);
        const positions2 = layout.place(items);

        expect(positions1).toEqual(positions2);
    });

    it('respects pinned nodes', () => {
        const layout = new ForcePlacement({ seed: 42, iterations: 100 });
        const items = makeItems(5);

        const previous = new Map([
            ['node-0', { x: 100, y: 100, z: 0 }],
            ['node-1', { x: 200, y: 200, z: 0 }],
        ]);

        const positions = layout.place(items, previous);

        expect(positions.get('node-0')).toEqual({ x: 100, y: 100, z: 0 });
        expect(positions.get('node-1')).toEqual({ x: 200, y: 200, z: 0 });
    });

    it('handles links between nodes', () => {
        const layout = new ForcePlacement({ seed: 42, iterations: 100 });
        const items: PlacementItem<{ links?: readonly string[]; radius?: number }>[] = [
            { id: 'a', width: 100, depth: 0, meta: { links: ['b'] } },
            { id: 'b', width: 100, depth: 0, meta: {} },
            { id: 'c', width: 100, depth: 0, meta: {} },
        ];

        const positions = layout.place(items);

        // Linked nodes should be closer than unlinked
        const distAB = Math.hypot(
            positions.get('a')!.x - positions.get('b')!.x,
            positions.get('a')!.y - positions.get('b')!.y,
        );
        const distAC = Math.hypot(
            positions.get('a')!.x - positions.get('c')!.x,
            positions.get('a')!.y - positions.get('c')!.y,
        );

        expect(distAB).toBeLessThan(distAC);
    });

    it('uses Barnes-Hut for large graphs', () => {
        const layout = new ForcePlacement({ 
            seed: 42, 
            iterations: 50,
            barnesHut: true,
            barnesHutThreshold: 10,
        });
        const items = makeItems(20);

        const positions = layout.place(items);

        expect(positions.size).toBe(20);
        for (const pos of positions.values()) {
            expect(Number.isFinite(pos.x)).toBe(true);
            expect(Number.isFinite(pos.y)).toBe(true);
        }
    });

    it('can disable Barnes-Hut', () => {
        const layout = new ForcePlacement({ 
            seed: 42, 
            iterations: 50,
            barnesHut: false,
        });
        const items = makeItems(20);

        const positions = layout.place(items);

        expect(positions.size).toBe(20);
        for (const pos of positions.values()) {
            expect(Number.isFinite(pos.x)).toBe(true);
            expect(Number.isFinite(pos.y)).toBe(true);
        }
    });

    it('handles custom theta parameter', () => {
        const layout = new ForcePlacement({ 
            seed: 42, 
            iterations: 50,
            barnesHut: true,
            barnesHutThreshold: 5,
            theta: 0.8,
        });
        const items = makeItems(10);

        const positions = layout.place(items);

        expect(positions.size).toBe(10);
    });

    it('respects depth in Z coordinate', () => {
        const layout = new ForcePlacement({ seed: 42, iterations: 50, depthStep: 64 });
        const items: PlacementItem<{ links?: readonly string[]; radius?: number }>[] = [
            { id: 'a', width: 100, depth: 0, meta: {} },
            { id: 'b', width: 100, depth: 1, meta: {} },
            { id: 'c', width: 100, depth: 2, meta: {} },
        ];

        const positions = layout.place(items);

        expect(positions.get('a')!.z).toBe(0);
        expect(positions.get('b')!.z).toBe(64);
        expect(positions.get('c')!.z).toBe(128);
    });

    it('handles single node', () => {
        const layout = new ForcePlacement({ seed: 42, iterations: 50 });
        const items = makeItems(1);

        const positions = layout.place(items);

        expect(positions.size).toBe(1);
    });

    it('handles empty items', () => {
        const layout = new ForcePlacement({ seed: 42, iterations: 50 });
        const items: PlacementItem<{ links?: readonly string[]; radius?: number }>[] = [];

        const positions = layout.place(items);

        expect(positions.size).toBe(0);
    });

    it('collision resolution prevents overlap', () => {
        const layout = new ForcePlacement({ seed: 42, iterations: 100, spacing: 50 });
        const items: PlacementItem<{ links?: readonly string[]; radius?: number }>[] = [
            { id: 'a', width: 200, depth: 0, meta: { radius: 100 } },
            { id: 'b', width: 200, depth: 0, meta: { radius: 100 } },
        ];

        const positions = layout.place(items);

        const dist = Math.hypot(
            positions.get('a')!.x - positions.get('b')!.x,
            positions.get('a')!.y - positions.get('b')!.y,
        );

        // Nodes should not overlap (distance >= sum of radii = 200)
        expect(dist).toBeGreaterThanOrEqual(190); // Allow small tolerance
    });
});