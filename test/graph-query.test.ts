import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GraphQuery } from '../src/core/GraphQuery';
import type { Edge } from '../src/edges/Edge';
import { Node } from '../src/nodes/Node';

class PointNode extends Node {
    readonly object = new THREE.Group();
}

const node = (id: string, x = 0, y = 0, z = 0): Node =>
    new PointNode({ id, type: 'PointNode', position: [x, y, z] });

const edge = (id: string, source: Node, target: Node): Edge =>
    ({ id, source, target }) as unknown as Edge;

describe('GraphQuery coordinate queries', () => {
    it('accepts a plain world point and compares squared distance', () => {
        const near = node('near', 3, 4);
        const far = node('far', 11);
        const query = new GraphQuery(
            new Map([near, far].map((item) => [item.id, item])),
            new Map(),
        );

        expect(query.getNodesNear({ x: 0, y: 0, z: 0 }, 5).map((item) => item.id)).toEqual([
            'near',
        ]);
        expect(query.getNodesNear({ x: 0, y: 0, z: 0 }, 20)).toHaveLength(2);
    });

    it('counts each incident edge once without allocating an edge list', () => {
        const a = node('a');
        const b = node('b');
        const query = new GraphQuery(
            new Map([a, b].map((item) => [item.id, item])),
            new Map([
                ['ab', edge('ab', a, b)],
                ['ba', edge('ba', b, a)],
                ['loop', edge('loop', a, a)],
            ]),
        );

        expect(query.getNodeDegree('a')).toBe(3);
        expect(query.getNodeDegree('b')).toBe(2);
        expect(query.getNodeDegree('missing')).toBe(0);
    });
});
