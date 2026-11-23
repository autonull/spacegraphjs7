import { describe, expect, it } from 'vitest';
import { appendTo, requireElement, seededRandom, seededRandom31 } from 'spacegraphjs/utils';

describe('seededRandom', () => {
    const draw = (random: () => number): number[] => [random(), random(), random()];

    it('repeats a sequence for the same seed and diverges for another', () => {
        expect(draw(seededRandom(41))).toEqual(draw(seededRandom(41)));
        expect(draw(seededRandom(41))).not.toEqual(draw(seededRandom(42)));
    });

    it('draws numbers in the unit interval', () => {
        expect(draw(seededRandom(41)).every((value) => value >= 0 && value < 1)).toBe(true);
    });
});

describe('seededRandom31', () => {
    it('keeps the graph generators historical sequence', () => {
        const random = seededRandom31(41);
        expect([random(), random(), random()]).toEqual([
            0.06844326018748957,
            0.9992315028790532,
            0.1978328228918057,
        ]);
    });
});

describe('requireElement', () => {
    it('returns the element for an existing id', () => {
        document.body.innerHTML = '<div id="target"></div>';
        expect(requireElement('target')).toBe(document.getElementById('target'));
    });

    it('throws a labelled error when the id is missing', () => {
        expect(() => requireElement('absent', 'demo host')).toThrow('demo host: missing #absent');
    });
});

describe('appendTo', () => {
    it('creates a bucket on first use and appends to it afterwards', () => {
        const buckets = new Map<string, number[]>();
        appendTo(buckets, 'a', 1);
        appendTo(buckets, 'a', 2);
        appendTo(buckets, 'b', 3);
        expect([...buckets]).toEqual([
            ['a', [1, 2]],
            ['b', [3]],
        ]);
    });
});
