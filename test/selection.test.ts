import { describe, expect, it } from 'vitest';
import { Selection } from '../src/core/Selection';

type FakeNode = { id: string; controlState: string; setControlState(state: string): void };

function makeSg(nodeIds: string[] = [], edgeIds: string[] = []) {
  const emitted: Array<{ type: string; payload: any }> = [];
  const nodes = new Map<string, FakeNode>(
    nodeIds.map((id) => {
      const node: FakeNode = {
        id,
        controlState: 'normal',
        setControlState(state) {
          node.controlState = state;
        },
      };
      return [id, node];
    })
  );
  const edges = new Map<string, { id: string }>(edgeIds.map((id) => [id, { id }]));
  const sg = {
    graph: { nodes, edges },
    events: { emit: (type: string, payload: any) => emitted.push({ type, payload }) },
  };
  return { sg: sg as any, emitted, nodes, edges };
}

const ids = (emitted: Array<{ type: string; payload: any }>) =>
  emitted.filter((e) => e.type === 'selection:changed').map((e) => e.payload.ids);

describe('Selection', () => {
  it('selects a single node by id and marks it selected', () => {
    const { sg, nodes } = makeSg(['a']);
    const selection = new Selection(sg);
    selection.select('a');
    expect(selection.list).toEqual(['a']);
    expect(selection.has('a')).toBe(true);
    expect(nodes.get('a')!.controlState).toBe('selected');
  });

  it('emits selection:changed and node:selection-changed', () => {
    const { sg, emitted } = makeSg(['a']);
    const selection = new Selection(sg);
    selection.select('a');
    expect(ids(emitted)).toEqual([['a']]);
    expect(emitted).toContainEqual({
      type: 'node:selection-changed',
      payload: { id: 'a', selected: true },
    });
    expect(emitted.find((e) => e.type === 'selection:changed')!.payload.nodes instanceof Set).toBe(
      true
    );
  });

  it('replaces the previous set and clears the dropped node state', () => {
    const { sg, nodes, emitted } = makeSg(['a', 'b']);
    const selection = new Selection(sg);
    selection.select(['a', 'b']);
    selection.select('a');
    expect(selection.list).toEqual(['a']);
    expect(nodes.get('b')!.controlState).toBe('normal');
    expect(emitted).toContainEqual({
      type: 'node:selection-changed',
      payload: { id: 'b', selected: false },
    });
  });

  it('deselects and toggles individual ids', () => {
    const { sg } = makeSg(['a', 'b']);
    const selection = new Selection(sg);
    selection.select(['a', 'b']);
    selection.deselect('a');
    expect(selection.list).toEqual(['b']);
    selection.toggle('b');
    expect(selection.list).toEqual([]);
    selection.toggle('b');
    expect(selection.list).toEqual(['b']);
  });

  it('clears selection with null, undefined, and clear()', () => {
    const { sg } = makeSg(['a']);
    const selection = new Selection(sg);
    selection.select('a');
    selection.select(null);
    expect(selection.list).toEqual([]);
    selection.select('a');
    selection.clear();
    expect(selection.list).toEqual([]);
  });

  it('ignores ids that are neither nodes nor edges', () => {
    const { sg } = makeSg(['a'], ['e1']);
    const selection = new Selection(sg);
    selection.select(['a', 'ghost', 'e1']);
    expect(selection.list).toEqual(['a', 'e1']);
  });
});
