import { describe, expect, test } from 'bun:test';
import { SessionKernel } from './session';
import type { KernelOp } from './session';

const entry = (id: string, op: KernelOp) => ({ id, op });

const addNode = (id: string): KernelOp => ({
  op: 'add-node',
  node: { id, kind: 'node', label: id },
});

const removeNode = (id: string): KernelOp => ({ op: 'remove-node', id });

describe('SessionKernel', () => {
  test('append folds the log into state and bumps the version', () => {
    const empty = new SessionKernel();
    const one = empty.append(entry('e1', addNode('a')));
    const two = one.append(entry('e2', addNode('b')));

    expect(empty.version).toBe(0);
    expect(one.version).toBe(1);
    expect(two.version).toBe(2);
    expect(empty.state().nodes).toEqual([]);
    expect(two.state().nodes.map((node) => node.id)).toEqual(['a', 'b']);
  });

  test('state is memoized per session version', () => {
    const session = new SessionKernel().append(entry('e1', addNode('a')));
    expect(session.state()).toBe(session.state());
  });

  test('removing an appended node is reflected in the fold', () => {
    const session = new SessionKernel()
      .append(entry('e1', addNode('a')))
      .append(entry('e2', addNode('b')))
      .append(entry('e3', removeNode('a')));

    expect(session.state().nodes.map((node) => node.id)).toEqual(['b']);
  });

  test('tag records the current version without appending an entry', () => {
    const session = new SessionKernel().append(entry('e1', addNode('a'))).tag('v1');

    expect(session.tags.get('v1')).toBe(1);
    expect(session.entries.length).toBe(1);
    expect(session.version).toBe(1);
  });

  test('checkout replays the log to an earlier version', () => {
    const session = new SessionKernel()
      .append(entry('e1', addNode('a')))
      .append(entry('e2', addNode('b')))
      .tag('v2');
    const checkedOut = session.checkout(1);

    expect(checkedOut.version).toBe(1);
    expect(checkedOut.entries.length).toBe(1);
    expect(checkedOut.state().nodes.map((node) => node.id)).toEqual(['a']);
    expect(checkedOut.tags.has('v2')).toBe(false);
  });

  test('fork marks the source version', () => {
    const session = new SessionKernel()
      .append(entry('e1', addNode('a')))
      .append(entry('e2', addNode('b')));
    const forked = session.fork(1);

    expect(forked.version).toBe(1);
    expect(forked.forkedFrom).toBe(1);
    expect(forked.state().nodes.map((node) => node.id)).toEqual(['a']);
  });

  test('checkout rejects an out-of-range version', () => {
    const session = new SessionKernel().append(entry('e1', addNode('a')));

    expect(() => session.checkout(2)).toThrow('outside 0..1');
    expect(() => session.checkout(-1)).toThrow('outside 0..1');
  });
});
