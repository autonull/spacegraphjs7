import { describe, expect, test } from 'bun:test';
import { Kernel } from './kernel';
import type { Edge, Hyperedge, Node } from './kernel';

const node = (id: string, label = id): Node => ({ id, kind: 'node', label });
const edge = (id: string, source: string, target: string): Edge => ({
  id,
  kind: 'edge',
  source,
  target,
});
const hyperedge = (id: string, nodes: string[]): Hyperedge => ({
  id,
  kind: 'hyperedge',
  nodes,
});

describe('Kernel', () => {
  test('modify returns a new version and preserves insertion order', () => {
    const original = new Kernel({
      nodes: [node('a')],
      edges: [edge('e1', 'a', 'a')],
      hyperedges: [],
    });
    const next = original.modify((builder) => {
      builder.nodes.set('b', node('b'));
      builder.edges.set('e2', edge('e2', 'a', 'b'));
    });

    expect(original.version).toBe(0);
    expect(next.version).toBe(1);
    expect(original.nodes.map((item) => item.id)).toEqual(['a']);
    expect(next.nodes.map((item) => item.id)).toEqual(['a', 'b']);
    expect(next.edges.map((item) => item.id)).toEqual(['e1', 'e2']);
  });

  test('modify can remove nodes, edges and hyperedges', () => {
    const original = new Kernel({
      nodes: [node('a'), node('b')],
      edges: [edge('e1', 'a', 'b')],
      hyperedges: [hyperedge('h1', ['a', 'b'])],
    });
    const next = original.modify((builder) => {
      builder.nodes.delete('b');
      builder.edges.delete('e1');
      builder.hyperedges.delete('h1');
    });

    expect(next.nodes.map((item) => item.id)).toEqual(['a']);
    expect(next.edges).toEqual([]);
    expect(next.hyperedges).toEqual([]);
  });

  test('diagnostics reports dangling edges, duplicates and missing hyperedge nodes', () => {
    const kernel = new Kernel({
      nodes: [node('a'), node('a'), node('b')],
      edges: [edge('e1', 'a', 'b'), edge('e1', 'a', 'b'), edge('e2', 'a', 'missing')],
      hyperedges: [hyperedge('h1', ['a', 'missing'])],
    });

    expect(kernel.diagnostics()).toEqual({
      danglingEdges: ['e2'],
      duplicateNodes: ['a'],
      duplicateEdges: ['e1'],
      hyperedgeMissingNodes: [{ hyperedge: 'h1', node: 'missing' }],
    });
  });

  test('subgraph keeps only internal edges and hyperedges', () => {
    const kernel = new Kernel({
      nodes: [node('a'), node('b'), node('c')],
      edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
      hyperedges: [hyperedge('h1', ['a', 'b']), hyperedge('h2', ['b', 'c'])],
    });
    const sub = kernel.subgraph(['a', 'b']);

    expect(sub.nodes.map((item) => item.id)).toEqual(['a', 'b']);
    expect(sub.edges.map((item) => item.id)).toEqual(['e1']);
    expect(sub.hyperedges.map((item) => item.id)).toEqual(['h1']);
    expect(sub.version).toBe(kernel.version);
  });

  test('filterNodes delegates to subgraph', () => {
    const kernel = new Kernel({
      nodes: [node('a'), node('b')],
      edges: [edge('e1', 'a', 'b')],
      hyperedges: [],
    });
    const filtered = kernel.filterNodes((item) => item.id === 'a');

    expect(filtered.nodes.map((item) => item.id)).toEqual(['a']);
    expect(filtered.edges).toEqual([]);
  });
});
