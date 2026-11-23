import { describe, expect, it } from 'bun:test';
import { diffCollectionById, stableSerialize } from './collection-diff';

type Item = { readonly id: string; readonly value?: unknown };

describe('diffCollectionById', () => {
    it('classifies added, removed and changed items by id', () => {
        const before: Item[] = [{ id: 'a', value: 1 }, { id: 'b', value: 2 }];
        const after: Item[] = [{ id: 'b', value: 3 }, { id: 'c', value: 4 }];

        expect(diffCollectionById(before, after)).toEqual({
            added: [{ id: 'c', value: 4 }],
            removed: [{ id: 'a', value: 1 }],
            changed: [{ id: 'b', before: { id: 'b', value: 2 }, after: { id: 'b', value: 3 } }],
        });
    });

    it('ignores object key order by default', () => {
        const before: Item[] = [{ id: 'a', value: { x: 1, y: 2 } }];
        const after: Item[] = [{ id: 'a', value: { y: 2, x: 1 } }];
        expect(diffCollectionById(before, after).changed).toEqual([]);
    });

    it('honours a custom serializer', () => {
        const before: Item[] = [{ id: 'a', value: 1 }];
        const after: Item[] = [{ id: 'a', value: 2 }];
        const diff = diffCollectionById(before, after, () => 'same');
        expect(diff.changed).toEqual([]);
    });

    it('serializes undefined and preserves array order', () => {
        expect(stableSerialize(undefined)).toBe('undefined');
        expect(stableSerialize([2, 1])).toBe('[2,1]');
    });
});
