import { describe, expect, it } from 'vitest';
import { requireElement, seededRandom } from 'spacegraphjs/utils';

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

describe('requireElement', () => {
    it('returns the element for an existing id', () => {
        document.body.innerHTML = '<div id="target"></div>';
        expect(requireElement('target')).toBe(document.getElementById('target'));
    });

    it('throws a labelled error when the id is missing', () => {
        expect(() => requireElement('absent', 'demo host')).toThrow('demo host: missing #absent');
    });
});
