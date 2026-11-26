// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DOTParser } from '../src/plugins/mermaid/parsers/dot';

const parse = (source: string) => new DOTParser().parse(source);

describe('DOT parser', () => {
    it('registers edge endpoints without treating edge attributes as nodes', () => {
        const diagram = parse('digraph G { a -> b; b -> c [label="x"]; }');
        expect(diagram.nodes.map((node) => [node.id, node.label])).toEqual([
            ['a', 'a'],
            ['b', 'b'],
            ['c', 'c'],
        ]);
        expect(diagram.edges.map((edge) => [edge.source, edge.target, edge.label])).toEqual([
            ['a', 'b', undefined],
            ['b', 'c', 'x'],
        ]);
    });

    it('keeps explicit node attributes', () => {
        const diagram = parse('digraph G { a [label="Alpha", shape="diamond"]; a -> b; }');
        expect(diagram.nodes).toMatchObject([
            { id: 'a', label: 'Alpha', shape: 'diamond' },
            { id: 'b', label: 'b', shape: 'rect' },
        ]);
    });

    it('reads undirected edges', () => {
        const diagram = parse('graph G { a -- b; }');
        expect(diagram.edges).toMatchObject([
            { source: 'a', target: 'b', arrowhead: 'none', style: 'solid' },
        ]);
        expect(diagram.nodes.map((node) => node.id)).toEqual(['a', 'b']);
    });
});
