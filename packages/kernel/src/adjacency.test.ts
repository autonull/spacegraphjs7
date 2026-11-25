import { describe, expect, it } from 'vitest';
import { adjacencyOf } from './adjacency';
import type { Edge } from './kernel';
const edge = (id: string, source: string, target: string): Edge => ({
    id,
    kind: 'k',
    source,
    target,
});
describe('adjacencyOf', () => {
    it('buckets visited values by source in edge order', () => {
        const map = adjacencyOf<string>(
            [edge('e1', 'a', 'b'), edge('e2', 'a', 'c'), edge('e3', 'b', 'c')],
            (current, add) => add(current.source, current.target),
        );
        expect(map.get('a')).toEqual(['b', 'c']);
        expect(map.get('b')).toEqual(['c']);
        expect(map.has('c')).toBe(false);
    });
});
