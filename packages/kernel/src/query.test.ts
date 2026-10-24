import { describe, expect, test } from 'bun:test';
import { Kernel } from './kernel';
import { query } from './query';
import type { Edge, Node } from './kernel';

const node = (id: string): Node => ({ id, kind: 'node', label: id });
const edge = (id: string, kind: string, source: string, target: string): Edge => ({
  id,
  kind,
  source,
  target,
});

const kernel = new Kernel({
  nodes: [node('a'), node('b'), node('c'), node('d')],
  edges: [
    edge('e1', 'links', 'a', 'b'),
    edge('e2', 'links', 'b', 'c'),
    edge('e3', 'other', 'a', 'd'),
  ],
  hyperedges: [],
});

describe('GraphQuery', () => {
  test('filters nodes and edges', () => {
    expect(query(kernel).nodes((item) => item.id !== 'd').map((item) => item.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(query(kernel).edges((item) => item.kind === 'other').map((item) => item.id)).toEqual([
      'e3',
    ]);
  });

  test('traverses outgoing edges in breadth-first order', () => {
    expect(query(kernel).traverse('a').map((item) => item.id)).toEqual(['a', 'b', 'd', 'c']);
  });

  test('traverses incoming and both directions', () => {
    expect(query(kernel).traverse('c', { direction: 'in' }).map((item) => item.id)).toEqual([
      'c',
      'b',
      'a',
    ]);
    expect(query(kernel).traverse('b', { direction: 'both' }).map((item) => item.id)).toEqual([
      'b',
      'a',
      'c',
      'd',
    ]);
  });

  test('respects edge kind and max depth', () => {
    expect(
      query(kernel).traverse('a', { direction: 'both', edgeKind: 'other' }).map((item) => item.id),
    ).toEqual(['a', 'd']);
    expect(query(kernel).traverse('a', { maxDepth: 1 }).map((item) => item.id)).toEqual([
      'a',
      'b',
      'd',
    ]);
  });

  test('finds a path between nodes', () => {
    expect(query(kernel).path('a', 'c')?.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(query(kernel).path('c', 'a', { direction: 'in' })?.map((item) => item.id)).toEqual([
      'c',
      'b',
      'a',
    ]);
    expect(query(kernel).path('a', 'missing')).toBeUndefined();
  });

  test('counts and collects', () => {
    expect(query(kernel).count()).toBe(4);
    expect(query(kernel).count((item) => item.id === 'a' || item.id === 'b')).toBe(2);
    expect(query(kernel).collect((graph) => graph.count() + graph.nodes().length)).toBe(8);
  });

  test('finds nearby nodes from positions', () => {
    const positions = new Map([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 10, y: 0 }],
      ['c', { x: 100, y: 0 }],
      ['d', { x: 5, y: 0 }],
    ]);
    expect(query(kernel, { positions }).near(0, 0, 20).map((item) => item.id)).toEqual([
      'a',
      'd',
      'b',
    ]);
    expect(query(kernel, { positions }).near(0, 0, 20, 2).map((item) => item.id)).toEqual([
      'a',
      'd',
    ]);
    expect(query(kernel).near(0, 0, 20)).toEqual([]);
  });
});
