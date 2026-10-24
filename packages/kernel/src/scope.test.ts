import { describe, expect, test } from 'bun:test';
import { Kernel } from './kernel';
import { deriveScope } from './scope';
import type { Edge, Node } from './kernel';

const node = (id: string, kind = 'node'): Node => ({ id, kind, label: id });
const edge = (id: string, source: string, target: string): Edge => ({
  id,
  kind: 'edge',
  source,
  target,
});

const kernel = new Kernel({
  nodes: [node('a', 'keep'), node('b', 'drop'), node('c', 'keep'), node('pinned', 'drop')],
  edges: [edge('e1', 'a', 'b'), edge('e2', 'a', 'c'), edge('e3', 'b', 'pinned')],
  hyperedges: [],
});

describe('deriveScope', () => {
  test('keeps nodes matching the predicate', () => {
    const scoped = deriveScope(kernel, (item) => item.kind === 'keep');

    expect(scoped.nodes.map((item) => item.id)).toEqual(['a', 'c']);
    expect(scoped.edges.map((item) => item.id)).toEqual(['e2']);
  });

  test('keeps pinned nodes even when the predicate drops them', () => {
    const scoped = deriveScope(kernel, (item) => item.kind === 'keep', ['pinned']);

    expect(scoped.nodes.map((item) => item.id)).toEqual(['a', 'c', 'pinned']);
    expect(scoped.edges.map((item) => item.id)).toEqual(['e2']);
  });

  test('keeps internal edges when a pinned node reconnects', () => {
    const scoped = deriveScope(kernel, (item) => item.kind === 'keep', ['b']);

    expect(scoped.nodes.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(scoped.edges.map((item) => item.id)).toEqual(['e1', 'e2']);
  });
});
