import { describe, expect, test } from 'bun:test';
import { Kernel } from './kernel';
import { WorkspaceKernel } from './workspace';
import type { Edge, Node } from './kernel';

const node = (id: string, label = id): Node => ({ id, kind: 'node', label });
const edge = (id: string, source: string, target: string): Edge => ({
  id,
  kind: 'edge',
  source,
  target,
});

describe('WorkspaceKernel', () => {
  test('replaceFrom stamps every element and replaces the kernel', () => {
    const base = WorkspaceKernel.from(
      new Kernel({ nodes: [node('old')], edges: [], hyperedges: [], version: 1 }),
    );
    const nextKernel = new Kernel({
      nodes: [node('a'), node('b')],
      edges: [edge('e1', 'a', 'b')],
      hyperedges: [],
      version: 2,
    });
    const replaced = base.replaceFrom(nextKernel);

    expect(replaced.kernel).toBe(nextKernel);
    expect(replaced.clock.get('node:a')).toBe(3);
    expect(replaced.clock.get('node:b')).toBe(3);
    expect(replaced.clock.get('edge:e1')).toBe(3);
    expect(replaced.clock.has('node:old')).toBe(false);
  });

  test('merge applies last-write-wins per element and appends new elements', () => {
    const base = new WorkspaceKernel({
      kernel: new Kernel({
        nodes: [node('a', 'old'), node('b', 'b')],
        edges: [edge('e1', 'a', 'b')],
        hyperedges: [],
        version: 1,
      }),
      clock: { 'node:a': 1, 'node:b': 1, 'edge:e1': 1 },
    });
    const other = new WorkspaceKernel({
      kernel: new Kernel({
        nodes: [node('a', 'new'), node('c', 'c')],
        edges: [edge('e1', 'a', 'c')],
        hyperedges: [],
        version: 2,
      }),
      clock: { 'node:a': 2, 'node:c': 2, 'edge:e1': 2 },
    });
    const merged = base.merge(other);

    expect(merged.kernel.nodes.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(merged.kernel.nodes.find((item) => item.id === 'a')?.label).toBe('new');
    expect(merged.kernel.edges[0]?.target).toBe('c');
    expect(merged.clock.get('node:a')).toBe(2);
    expect(merged.clock.get('node:b')).toBe(1);
    expect(merged.clock.get('node:c')).toBe(2);
    expect(merged.clock.get('edge:e1')).toBe(2);
    expect(merged.kernel.version).toBe(3);
  });

  test('merge keeps the local element when clocks tie', () => {
    const base = new WorkspaceKernel({
      kernel: new Kernel({ nodes: [node('a', 'local')], edges: [], hyperedges: [], version: 1 }),
      clock: { 'node:a': 2 },
    });
    const other = new WorkspaceKernel({
      kernel: new Kernel({ nodes: [node('a', 'remote')], edges: [], hyperedges: [], version: 1 }),
      clock: { 'node:a': 2 },
    });

    expect(base.merge(other).kernel.nodes[0]?.label).toBe('local');
  });
});
