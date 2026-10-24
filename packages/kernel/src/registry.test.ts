import { describe, expect, test } from 'bun:test';
import { composeRegistry, createRegistry } from './registry';

describe('Registry', () => {
  test('createRegistry copies partial registries', () => {
    const registry = createRegistry({
      nodeKinds: { node: { label: 'Node' } },
      actions: { inspect: { id: 'inspect', label: 'Inspect' } },
    });

    expect(registry.nodeKinds.node?.label).toBe('Node');
    expect(registry.edgeKinds).toEqual({});
    expect(registry.actions.inspect?.label).toBe('Inspect');
  });

  test('composeRegistry lets later registries win', () => {
    const first = createRegistry({
      nodeKinds: { node: { label: 'First' }, edge: { label: 'Edge' } },
      actions: { inspect: { id: 'inspect', label: 'Inspect' } },
    });
    const second = createRegistry({
      nodeKinds: { node: { label: 'Second' } },
      actions: { remove: { id: 'remove', label: 'Remove' } },
    });
    const composed = composeRegistry(first, undefined, second);

    expect(composed.nodeKinds.node?.label).toBe('Second');
    expect(composed.nodeKinds.edge?.label).toBe('Edge');
    expect(Object.keys(composed.actions).sort()).toEqual(['inspect', 'remove']);
  });
});
