import { describe, expect, it } from 'vitest';
import { Patterns } from '../src/builder/patterns';

describe('Patterns.tree', () => {
    it('attaches every node to a parent in the previous level', () => {
        const { nodes, edges } = Patterns.tree([1, 2, 2]).build();

        expect(nodes.map((node) => node.id)).toEqual([
            'node-0',
            'node-1',
            'node-2',
            'node-3',
            'node-4',
        ]);
        expect(edges.map((edge) => [edge.source, edge.target])).toEqual([
            ['node-0', 'node-1'],
            ['node-0', 'node-2'],
            ['node-1', 'node-3'],
            ['node-2', 'node-4'],
        ]);
    });
});

describe('Patterns.barbell', () => {
    it('joins both cliques through a single bridge node', () => {
        const { nodes, edges } = Patterns.barbell(2, 1).build();

        expect(nodes.map((node) => node.id)).toContain('right-0');
        expect(edges.map((edge) => [edge.source, edge.target])).toContainEqual([
            'bridge-0',
            'right-0',
        ]);
    });

    it('connects every bridge node to the next and the last to the right clique', () => {
        const { edges } = Patterns.barbell(2, 3).build();
        const links = edges.map((edge) => [edge.source, edge.target]);

        expect(links).toContainEqual(['bridge-0', 'bridge-1']);
        expect(links).toContainEqual(['bridge-1', 'bridge-2']);
        expect(links).toContainEqual(['bridge-2', 'right-0']);
    });
});
