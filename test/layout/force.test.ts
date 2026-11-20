import { describe, expect, it } from 'vitest';
import { ForcePlacement, type ForceMeta, type PlacementItem } from '../../src/layout';

const makeItems = (count: number): PlacementItem<ForceMeta>[] =>
    Array.from({ length: count }, (_, i) => ({
        id: `node-${i}`,
        width: 100,
        depth: 0,
        meta: {},
    }));

describe('ForcePlacement', () => {
    it('places nodes deterministically', () => {
        const layout = new ForcePlacement({ seed: 42, iterations: 100 });
        const items = makeItems(10);

        expect(layout.place(items)).toEqual(layout.place(items));
    });

    it('respects pinned nodes', () => {
        const layout = new ForcePlacement({ seed: 42, iterations: 100 });
        const previous = new Map([
            ['node-0', { x: 100, y: 100, z: 0 }],
            ['node-1', { x: 200, y: 200, z: 0 }],
        ]);

        const positions = layout.place(makeItems(5), previous);

        expect(positions.get('node-0')).toEqual({ x: 100, y: 100, z: 0 });
        expect(positions.get('node-1')).toEqual({ x: 200, y: 200, z: 0 });
    });

    it('pulls linked nodes closer than the same graph without links', () => {
        const items = (links?: readonly string[]): PlacementItem<ForceMeta>[] => [
            { id: 'a', width: 100, depth: 0, meta: { links } },
            { id: 'b', width: 100, depth: 0, meta: {} },
            { id: 'c', width: 100, depth: 0, meta: {} },
        ];
        const distance = (positions: ReadonlyMap<string, { x: number; y: number }>) =>
            Math.hypot(
                positions.get('a')!.x - positions.get('b')!.x,
                positions.get('a')!.y - positions.get('b')!.y,
            );
        const place = (links?: readonly string[]) =>
            new ForcePlacement({ seed: 42, iterations: 100 }).place(items(links));

        expect(distance(place(['b']))).toBeLessThan(distance(place()));
    });

    it('places large graphs through Barnes-Hut', () => {
        const layout = new ForcePlacement({ seed: 42, iterations: 50, useBarnesHut: true });

        const positions = layout.place(makeItems(120));

        expect(positions.size).toBe(120);
        for (const pos of positions.values()) {
            expect(Number.isFinite(pos.x)).toBe(true);
            expect(Number.isFinite(pos.y)).toBe(true);
        }
    });

    it('places large graphs without Barnes-Hut', () => {
        const layout = new ForcePlacement({ seed: 42, iterations: 50, useBarnesHut: false });

        const positions = layout.place(makeItems(20));

        expect(positions.size).toBe(20);
        for (const pos of positions.values()) {
            expect(Number.isFinite(pos.x)).toBe(true);
            expect(Number.isFinite(pos.y)).toBe(true);
        }
    });

    it('accepts a custom Barnes-Hut theta', () => {
        const layout = new ForcePlacement({
            seed: 42,
            iterations: 50,
            useBarnesHut: true,
            barnesHut: { theta: 0.8 },
        });

        expect(layout.place(makeItems(10)).size).toBe(10);
    });

    it('records depth in the Z coordinate', () => {
        const layout = new ForcePlacement({ seed: 42, iterations: 50, depthStep: 64 });
        const items: PlacementItem<ForceMeta>[] = [
            { id: 'a', width: 100, depth: 0, meta: {} },
            { id: 'b', width: 100, depth: 1, meta: {} },
            { id: 'c', width: 100, depth: 2, meta: {} },
        ];

        const positions = layout.place(items);

        expect(positions.get('a')!.z).toBe(0);
        expect(positions.get('b')!.z).toBe(64);
        expect(positions.get('c')!.z).toBe(128);
    });

    it('handles a single node', () => {
        const layout = new ForcePlacement({ seed: 42, iterations: 50 });

        expect(layout.place(makeItems(1)).size).toBe(1);
    });

    it('handles empty items', () => {
        const layout = new ForcePlacement({ seed: 42, iterations: 50 });

        expect(layout.place([]).size).toBe(0);
    });

    it('separates overlapping nodes', () => {
        const layout = new ForcePlacement({ seed: 42, iterations: 100, spacing: 50 });
        const items: PlacementItem<ForceMeta>[] = [
            { id: 'a', width: 200, depth: 0, meta: { radius: 100 } },
            { id: 'b', width: 200, depth: 0, meta: { radius: 100 } },
        ];

        const positions = layout.place(items);
        const distance = Math.hypot(
            positions.get('a')!.x - positions.get('b')!.x,
            positions.get('a')!.y - positions.get('b')!.y,
        );

        expect(distance).toBeGreaterThanOrEqual(190);
    });
});
