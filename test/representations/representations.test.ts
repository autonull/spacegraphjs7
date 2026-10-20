import { describe, expect, it } from 'vitest';
import { Representations, type RepresentationConfig } from '../../src/representations';

type TestNode = { id: string; kind: string; turnID?: string };

const CONFIG: RepresentationConfig<TestNode> = {
    nodeSizeFn: (node) => (node.kind === 'chip' ? [100, 40] : [200, 60]),
    cellSize: [100, 40],
    rowKeyFn: (node) => node.turnID,
    rowOrderFn: (nodes) => [...nodes].sort((a, b) => a.id.localeCompare(b.id)),
    columnKeyFn: (node) => (node.kind === 'phase' ? 1 : 0),
    levelFilter: (node) => node.kind !== 'hidden',
    categoryMap: { 0: 'session', 1: 'phase' },
};

const model = {
    rows: ['t1', 't2'],
    nodes: [
        { id: 'root', kind: 'session' },
        { id: 'a', kind: 'phase', turnID: 't1' },
        { id: 'b', kind: 'phase', turnID: 't1' },
        { id: 'c', kind: 'other', turnID: 't2' },
        { id: 'd', kind: 'other', turnID: 't2' },
        { id: 'hidden', kind: 'hidden', turnID: 't2' },
    ] as TestNode[],
};

describe('Representations.summaryRows', () => {
    it('leads with the root row and keeps the row order of the model', () => {
        const rows = Representations.summaryRows(model, CONFIG);

        expect(rows.map((row) => row.map((node) => node.id))).toEqual([
            ['root'],
            ['a', 'b'],
            ['c', 'd'],
        ]);
    });

    it('leaves out the nodes the host does not summarise', () => {
        const rows = Representations.summaryRows(model, CONFIG);

        expect(rows.flat().some((node) => node.id === 'hidden')).toBe(false);
    });
});

describe('Representations.ribbonLayout', () => {
    it('lays the members of a row out left to right', () => {
        const layout = Representations.ribbonLayout(model, CONFIG);
        const first = layout.positions.get('a')!;
        const second = layout.positions.get('b')!;

        expect(first.y).toBe(second.y);
        expect(second.x).toBeGreaterThan(first.x);
    });

    it('gives every row its own line', () => {
        const layout = Representations.ribbonLayout(model, CONFIG);

        expect(layout.positions.get('a')!.y).toBeLessThan(layout.positions.get('c')!.y);
    });

    it('never overlaps two segments', () => {
        const layout = Representations.ribbonLayout(model, CONFIG);
        const placed = model.nodes.filter((node) => layout.positions.has(node.id));

        for (let i = 0; i < placed.length; i++)
            for (let j = i + 1; j < placed.length; j++) {
                const a = layout.positions.get(placed[i]!.id)!;
                const b = layout.positions.get(placed[j]!.id)!;

                if (a.y !== b.y) continue;

                expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(
                    (CONFIG.nodeSizeFn(placed[i]!)[0] + CONFIG.nodeSizeFn(placed[j]!)[0]) / 2,
                );
            }
    });
});

describe('Representations.matrixLayout', () => {
    it('puts the nodes of a column in the same cell', () => {
        const layout = Representations.matrixLayout(model, CONFIG);
        const first = layout.positions.get('a')!;
        const second = layout.positions.get('b')!;

        expect(first.y).toBe(second.y);
        expect(second.x).toBeGreaterThan(first.x);
    });

    it('keeps the columns apart', () => {
        const layout = Representations.matrixLayout(model, CONFIG);

        expect(layout.positions.get('c')!.x).toBeLessThan(layout.positions.get('a')!.x);
        expect(layout.positions.get('a')!.y).not.toBe(layout.positions.get('c')!.y);
    });

    it('never overlaps two cells', () => {
        const layout = Representations.matrixLayout(model, CONFIG);
        const placed = model.nodes.filter((node) => layout.positions.has(node.id));

        for (let i = 0; i < placed.length; i++)
            for (let j = i + 1; j < placed.length; j++) {
                const a = layout.positions.get(placed[i]!.id)!;
                const b = layout.positions.get(placed[j]!.id)!;

                if (a.y !== b.y) continue;

                expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(
                    (CONFIG.nodeSizeFn(placed[i]!)[0] + CONFIG.nodeSizeFn(placed[j]!)[0]) / 2,
                );
            }
    });
});

describe('Representations.summaryColumns', () => {
    it('lists the labelled columns', () => {
        expect(Representations.summaryColumns(CONFIG)).toEqual([
            { column: 0, label: 'session' },
            { column: 1, label: 'phase' },
        ]);
    });
});
