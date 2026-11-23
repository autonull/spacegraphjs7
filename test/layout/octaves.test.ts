import { describe, expect, it } from 'vitest';
import { octaveLayout } from '../../src/layout/octaves';

const card = [400, 180] as const;

describe('multi-octave layout', () => {
    it('draws one hierarchy at halving world scales', () => {
        const result = octaveLayout(
            ['root', 'a', 'b', 'a1'],
            new Map([
                ['a', 'root'],
                ['b', 'root'],
                ['a1', 'a'],
            ]),
            { card, radiusFactor: 2, rootRadiusFactor: 2 },
        );
        expect(result.octaves.get('root')).toEqual({ octave: 0, scale: 1 });
        expect(result.octaves.get('a')).toEqual({ octave: -1, scale: 0.5 });
        expect(result.octaves.get('a1')).toEqual({ octave: -2, scale: 0.25 });
        const root = result.positions.get('root')!;
        const a = result.positions.get('a')!;
        const a1 = result.positions.get('a1')!;
        expect(Math.hypot(a.x - root.x, a.y - root.y)).toBeCloseTo(800, 5);
        expect(Math.hypot(a1.x - a.x, a1.y - a.y)).toBeCloseTo(400, 5);
    });

    it('caps recursion and ignores parent cycles', () => {
        const result = octaveLayout(
            ['a', 'b', 'c'],
            new Map([
                ['a', 'b'],
                ['b', 'a'],
                ['c', 'b'],
            ]),
            { card, maxDepth: 1 },
        );
        expect(result.positions.size).toBe(3);
        expect(result.octaves.get('c')!.octave).toBeGreaterThanOrEqual(-1);
    });

    it('keeps every node positioned and bounds the whole range', () => {
        const result = octaveLayout(['x', 'y', 'z'], new Map(), { card });
        expect(result.positions.size).toBe(3);
        expect(result.bounds.max.x).toBeGreaterThan(result.bounds.min.x);
        expect(result.bounds.max.y).toBeGreaterThan(result.bounds.min.y);
    });

    it('places a spiral deterministically and differently from a ring', () => {
        const ids = ['root', 'a', 'b', 'c', 'd'];
        const parentOf = new Map(ids.slice(1).map((id) => [id, 'root']));
        const options = { card, shape: 'spiral' as const, radiusFactor: 1, rootRadiusFactor: 1, phase: 0.2 };
        const spiral = octaveLayout(ids, parentOf, options);
        const ring = octaveLayout(ids, parentOf, { ...options, shape: 'ring' });
        expect(spiral.positions).toEqual(octaveLayout(ids, parentOf, options).positions);
        const distances = ids
            .slice(1)
            .map((id) => Math.hypot(spiral.positions.get(id)!.x, spiral.positions.get(id)!.y));
        expect(new Set(distances.map((value) => Math.round(value))).size).toBeGreaterThan(1);
        expect(spiral.positions.get('a')).not.toEqual(ring.positions.get('a'));
    });
});
