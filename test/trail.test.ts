import { describe, expect, it, vi } from 'vitest';
import { Trail, type TrailNode } from '../src/navigation/Trail';

const a: TrailNode = { id: 'a', label: 'Alpha' };
const b: TrailNode = { id: 'b', label: 'Beta' };
const c: TrailNode = { id: 'c', label: 'Gamma' };

describe('Trail', () => {
  it('pushes entries and tracks depth, current, and back/forward', () => {
    const trail = new Trail();
    trail.push(a);
    trail.push(b);
    expect(trail.entries).toEqual([a, b]);
    expect(trail.current).toEqual(b);
    expect(trail.depth).toBe(2);
    expect(trail.canGoBack).toBe(true);
    expect(trail.canGoForward).toBe(false);
    expect(trail.back()).toEqual(a);
    expect(trail.canGoForward).toBe(true);
    expect(trail.forward()).toEqual(b);
  });

  it('truncates forward history when pushing after a back', () => {
    const trail = new Trail();
    trail.push(a);
    trail.push(b);
    trail.push(c);
    trail.back();
    trail.push({ id: 'd', label: 'Delta' });
    expect(trail.entries.map((entry) => entry.id)).toEqual(['a', 'b', 'd']);
    expect(trail.depth).toBe(3);
  });

  it('refreshes the current entry when pushing the same id', () => {
    const trail = new Trail();
    trail.push(a);
    trail.push({ id: 'a', label: 'Alpha 2' });
    expect(trail.entries).toEqual([{ id: 'a', label: 'Alpha 2' }]);
    expect(trail.depth).toBe(1);
  });

  it('replaces and resets', () => {
    const trail = new Trail();
    trail.push(a);
    trail.replace({ id: 'a', label: 'Alpha 2' });
    expect(trail.current).toEqual({ id: 'a', label: 'Alpha 2' });
    trail.reset(b);
    expect(trail.entries).toEqual([b]);
    trail.reset();
    expect(trail.entries).toEqual([]);
    expect(trail.depth).toBe(0);
    expect(trail.current).toBeUndefined();
  });

  it('trims history to maxDepth', () => {
    const trail = new Trail({ maxDepth: 2 });
    trail.push(a);
    trail.push(b);
    trail.push(c);
    expect(trail.entries.map((entry) => entry.id)).toEqual(['b', 'c']);
    expect(trail.depth).toBe(2);
  });

  it('reconciles entries by id after a model update', () => {
    const trail = new Trail();
    trail.push(a);
    trail.push(b);
    trail.push(c);
    trail.back();
    trail.reconcile(
      new Map([
        ['a', { id: 'a', label: 'Alpha!' }],
        ['c', { id: 'c', label: 'Gamma!' }],
      ])
    );
    expect(trail.entries.map((entry) => entry.id)).toEqual(['a', 'c']);
    expect(trail.entries.map((entry) => entry.label)).toEqual(['Alpha!', 'Gamma!']);
    expect(trail.current?.id).toBe('c');
  });

  it('resets when nothing survives reconciliation', () => {
    const trail = new Trail();
    trail.push(a);
    trail.reconcile(new Map());
    expect(trail.entries).toEqual([]);
  });

  it('reports labels and notifies listeners', () => {
    const trail = new Trail();
    const listener = vi.fn();
    const off = trail.onChange(listener);
    trail.push(a);
    trail.push({ id: 'x' });
    expect(trail.toLabels()).toEqual(['Alpha', 'x']);
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    trail.push(b);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
