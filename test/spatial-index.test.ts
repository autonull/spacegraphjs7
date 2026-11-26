import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SpatialIndex } from '../src/core/spatial/SpatialIndex';

const point = (id: string, x: number, y = 0) => ({ id, position: new Vector3(x, y, 0) });

describe('SpatialIndex', () => {
    it('returns independent query results across calls that reuse scratch buffers', () => {
        const index = new SpatialIndex(10);
        const nodes = [point('a', 1), point('b', 2), point('far', 30)];
        index.build(nodes);

        const first = index.queryBox(new Box3(new Vector3(0, -1, -1), new Vector3(5, 1, 1)));
        first.length = 0;
        const second = index.queryRadius(new Vector3(0, 0, 0), 5);

        expect(second.map((node) => node.id).sort()).toEqual(['a', 'b']);
        expect(index.getStats().nodeCount).toBe(3);
    });

    it('reports each overlapping pair once when nodes share cells', () => {
        const index = new SpatialIndex(10);
        const nodes = [point('a', 1), point('b', 1.5)];
        index.build(nodes);

        expect(index.findAllOverlaps()).toHaveLength(1);
    });
});
