import { describe, expect, it } from 'vitest';
import { chapterPacking } from '../../src/layout/chapters';

const card = [360, 200] as const;

describe('chapter packing', () => {
    it('caps columns to the viewport and packs rows below', () => {
        const wide = chapterPacking(['a', 'b', 'c', 'd'], { card, viewport: { width: 1600, height: 900 } });
        expect([...wide.values()].map((point) => point.x)).toEqual([0, 416, 0, 416]);
        expect([...wide.values()].map((point) => point.y)).toEqual([0, 0, 248, 248]);

        const narrow = chapterPacking(['a', 'b'], { card, viewport: { width: 600, height: 900 } });
        expect([...narrow.values()].map((point) => point.y)).toEqual([0, 248]);
    });

    it('keeps previous cells for streamed chapters', () => {
        const first = chapterPacking(['a', 'b', 'c'], { card, columns: 2 });
        const next = chapterPacking(['a', 'b', 'c', 'd'], { card, columns: 2, previous: first });
        expect(next.get('b')).toEqual(first.get('b'));
        expect(next.get('c')).toEqual(first.get('c'));
        expect(next.get('d')).toEqual({ x: 416, y: 248, z: 0 });
    });

    it('uses the configured gap', () => {
        const packed = chapterPacking(['a', 'b'], { card, gap: [0, 0], columns: 2 });
        expect(packed.get('b')).toEqual({ x: 360, y: 0, z: 0 });
    });
});
