// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ForcePlacement, GridPlacement, TreePlacement } from '../../src/layout';
import type { PlacementItem } from '../../src/layout';

type Meta = { parent?: string; links?: readonly string[]; radius?: number };

const item = (
    id: string,
    meta?: Meta,
    width = 200,
): PlacementItem<Meta> => ({ id, width, meta });

describe('the placement seam', () => {
    it('lets an engine place boxes without the grid', () => {
        const engine = new TreePlacement({ columnPitch: 100, rowPitch: 50 });
        const positions = engine.place([
            item('root'),
            item('child', { parent: 'root' }),
            item('other', { parent: 'root' }),
        ]);

        expect(positions.get('child')?.y).toBe(-50);
        expect(positions.get('child')?.x).toBe(50);
        expect(positions.get('other')?.x).toBe(150);
        // The parent sits over the middle of its children.
        expect(positions.get('root')?.x).toBe(100);
    });

    it('keeps a placed box where it was when the layout hands the positions back', () => {
        const engine = new TreePlacement({ columnPitch: 100, rowPitch: 50 });
        const before = engine.place([item('root'), item('child', { parent: 'root' })]);
        const after = engine.place([item('root'), item('child', { parent: 'root' }), item('new', { parent: 'child' })], before);

        expect(after.get('root')).toEqual(before.get('root'));
        expect(after.get('child')).toEqual(before.get('child'));
        expect(after.has('new')).toBe(true);
    });

    it('places a grid box in its lane and column', () => {
        const engine = new GridPlacement({ lanes: ['top', 'bottom'], lanePitch: 60, step: 24 });
        const positions = engine.place([
            { id: 'a', width: 200, meta: { group: 'c1', lane: 'bottom' } },
            { id: 'b', width: 200, meta: { group: 'c2', lane: 'bottom' } },
        ]);

        expect(positions.get('a')?.y).toBe(60);
        expect(positions.get('b')?.x).toBeGreaterThan(positions.get('a')!.x);
    });
});

describe('the tree placement', () => {
    it('is deterministic', () => {
        const engine = new TreePlacement();
        const boxes = [item('root'), item('a', { parent: 'root' }), item('b', { parent: 'root' })];

        expect([...engine.place(boxes).entries()]).toEqual([...engine.place(boxes).entries()]);
    });

    it('grows downward: a child sits one row below its parent', () => {
        const engine = new TreePlacement({ columnPitch: 100, rowPitch: 40 });
        const positions = engine.place([
            item('root'),
            item('a', { parent: 'root' }),
            item('b', { parent: 'a' }),
        ]);

        expect(positions.get('a')!.y - positions.get('root')!.y).toBe(-40);
        expect(positions.get('b')!.y - positions.get('a')!.y).toBe(-40);
    });

    it('leaves a placed box where it was when a child is appended', () => {
        const engine = new TreePlacement({ columnPitch: 100, rowPitch: 40 });
        const before = engine.place([item('root'), item('a', { parent: 'root' })]);
        const after = engine.place([item('root'), item('a', { parent: 'root' }), item('b', { parent: 'root' })], before);

        expect(after.get('root')).toEqual(before.get('root'));
        expect(after.get('a')).toEqual(before.get('a'));
    });

    it('places an appended box next to its parent when there is room', () => {
        const engine = new TreePlacement({ columnPitch: 100, rowPitch: 40 });
        const before = engine.place([item('root'), item('a', { parent: 'root' })]);
        const after = engine.place([item('root'), item('a', { parent: 'root' }), item('b', { parent: 'root' })], before);

        expect(Math.abs(after.get('b')!.x - after.get('root')!.x)).toBeLessThanOrEqual(100);
    });

    it('folds a block to the next row when it holds more leaves than the column count', () => {
        const wide = new TreePlacement({ columnPitch: 100, rowPitch: 40, columns: 4 });
        const narrow = new TreePlacement({ columnPitch: 100, rowPitch: 40, columns: 2 });
        const boxes = [
            item('root'),
            item('a', { parent: 'root' }),
            item('b', { parent: 'root' }),
            item('c', { parent: 'root' }),
        ];

        const widePositions = wide.place(boxes);
        const narrowPositions = narrow.place(boxes);

        // Three leaves in one row of four columns: the block is one row deep.
        expect(widePositions.get('c')!.x - widePositions.get('a')!.x).toBe(200);
        expect(widePositions.get('c')!.y).toBe(widePositions.get('a')!.y);

        // Two leaves per row: the third leaf folds to the next row, in the first column.
        expect(narrowPositions.get('c')!.x).toBe(narrowPositions.get('a')!.x);
        expect(narrowPositions.get('c')!.y).toBeLessThan(narrowPositions.get('a')!.y);
    });

    it('keeps two boxes from overlapping', () => {
        const engine = new TreePlacement({ columnPitch: 100, rowPitch: 40 });
        const positions = engine.place([
            item('root'),
            item('a', { parent: 'root' }),
            item('b', { parent: 'root' }),
            item('c', { parent: 'root' }),
        ]);
        const points = [...positions.values()];

        for (let i = 0; i < points.length; i++)
            for (let j = i + 1; j < points.length; j++)
                expect(
                    Math.abs(points[i]!.x - points[j]!.x) >= 100 ||
                        Math.abs(points[i]!.y - points[j]!.y) >= 40,
                ).toBe(true);
    });
});

describe('the force placement', () => {
    const boxes = [
        item('a'),
        item('b'),
        item('c'),
        item('d', { links: ['a'] }),
        item('e', { links: ['a'] }),
    ];

    it('is deterministic', () => {
        const engine = new ForcePlacement();

        expect([...engine.place(boxes).entries()]).toEqual([...engine.place(boxes).entries()]);
    });

    it('keeps a placed box where it was when the layout hands the positions back', () => {
        const engine = new ForcePlacement();
        const before = engine.place(boxes);
        const after = engine.place([...boxes, item('f', { links: ['a'] })], before);

        for (const id of before.keys()) expect(after.get(id)).toEqual(before.get(id));
        expect(after.has('f')).toBe(true);
    });

    it('pushes two boxes apart', () => {
        const engine = new ForcePlacement({ spacing: 200, iterations: 200 });
        const positions = engine.place([item('a'), item('b')]);
        const distance = Math.hypot(
            positions.get('a')!.x - positions.get('b')!.x,
            positions.get('a')!.y - positions.get('b')!.y,
        );

        expect(distance).toBeGreaterThan(100);
    });

    it('pulls a linked box towards the one it links to', () => {
        const engine = new ForcePlacement({ spacing: 200, iterations: 200 });
        const positions = engine.place([item('a'), item('linked', { links: ['a'] })]);
        const distance = Math.hypot(
            positions.get('a')!.x - positions.get('linked')!.x,
            positions.get('a')!.y - positions.get('linked')!.y,
        );

        expect(distance).toBeLessThan(600);
    });
});
