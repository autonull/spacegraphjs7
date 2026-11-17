import { describe, expect, it } from 'vitest';
import { contentBounds, declaredEmpty } from 'spacegraphjs/layout';

const positions = new Map([
    ['a', { x: 0, y: 0, z: 0 }],
    ['b', { x: 100, y: 50, z: 0 }],
    ['empty-turn', { x: 10_000, y: 0, z: 0 }],
]);
const items = [
    { id: 'a', meta: { group: 'turn-a' } },
    { id: 'b', meta: { group: 'turn-b' } },
    { id: 'empty-turn', meta: { group: 'turn-empty', empty: true } },
];

describe('fit bounds', () => {
    it('identifies declared-empty placeholders', () => {
        expect(declaredEmpty(items)).toEqual(new Set(['empty-turn']));
    });

    it('excludes empty columns from the frame the camera fits', () => {
        expect(contentBounds(positions, declaredEmpty(items))).toEqual({
            min: { x: 0, y: 0, z: 0 },
            max: { x: 100, y: 50, z: 0 },
        });
        expect(contentBounds(positions).max.x).toBe(10_000);
    });

    it('returns zero bounds when every position is empty', () => {
        expect(contentBounds(positions, new Set(positions.keys()))).toEqual({
            min: { x: 0, y: 0, z: 0 },
            max: { x: 0, y: 0, z: 0 },
        });
    });
});
