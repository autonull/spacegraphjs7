// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { LaneLayout } from '../src/layout/LaneLayout';

const LANES = ['prompt', 'narrative', 'explore', 'edit', 'verify', 'delegate', 'artifacts'];

const make = () =>
  new LaneLayout({ lanes: LANES, laneGap: 56, step: 48, groupGap: 320, depthStep: 64 });

describe('LaneLayout', () => {
  it('maps lane index to Y', () => {
    const layout = make();
    expect(layout.place({ id: 'a', lane: 'explore' })[1]).toBe(2 * 56);
    expect(layout.place({ id: 'b', lane: 'artifacts' })[1]).toBe(6 * 56);
    expect(layout.place({ id: 'c', lane: 'missing' })[1]).toBe(0);
  });

  it('spaces ordinals within a group and depth on Z', () => {
    const layout = make();
    expect(layout.place({ id: 'a', group: 't1', ordinal: 0, lane: 'explore', depth: 2 })).toEqual([
      0, 112, 128,
    ]);
    expect(layout.place({ id: 'b', group: 't1', ordinal: 3, lane: 'edit' })).toEqual([144, 168, 0]);
  });

  it('appends a new group without moving earlier items', () => {
    const layout = make();
    const first = layout.place({ id: 'a', group: 't1', ordinal: 0 });
    layout.place({ id: 'b', group: 't1', ordinal: 1 });
    const second = layout.place({ id: 'c', group: 't2', ordinal: 0 });
    expect(first).toEqual([0, 0, 0]);
    expect(second[0]).toBe(320);
    expect(layout.place({ id: 'b', group: 't1', ordinal: 1 })).toEqual([48, 0, 0]);
  });

  it('places the same id once', () => {
    const layout = make();
    const first = layout.place({ id: 'a', lane: 'explore', ordinal: 1 });
    expect(layout.place({ id: 'a', lane: 'verify', ordinal: 9 })).toBe(first);
  });

  it('reserves room for an in-flight group', () => {
    const layout = make();
    layout.place({ id: 'a', group: 't1' });
    layout.reserve('t2', 150);
    const later = layout.place({ id: 'b', group: 't3' });
    expect(later[0]).toBe(320 + 150 + 320);
    expect(layout.place({ id: 'c', group: 't2' })[0]).toBe(320);
  });

  it('computes bounds over a subset', () => {
    const layout = make();
    layout.placeAll([
      { id: 'a', lane: 'explore', group: 't1' },
      { id: 'b', lane: 'edit', group: 't1', ordinal: 2 },
    ]);
    const bounds = layout.bounds(['a', 'b']);
    expect(bounds?.min).toEqual([0, 112, 0]);
    expect(bounds?.max).toEqual([96, 168, 0]);
    expect(bounds?.center).toEqual([48, 140, 0]);
    expect(bounds?.size).toEqual([96, 56, 0]);
    expect(layout.bounds([])).toBeUndefined();
  });

  it('is deterministic and append-only across instances', () => {
    const items = [
      { id: 'a', lane: 'explore', group: 't1', ordinal: 0 },
      { id: 'b', lane: 'edit', group: 't1', ordinal: 1 },
      { id: 'c', lane: 'verify', group: 't2', ordinal: 0 },
    ];
    const a = make();
    const b = make();
    a.placeAll(items);
    b.placeAll(items);
    expect(a.positions).toEqual(b.positions);
    a.place({ id: 'd', lane: 'artifacts', group: 't3' });
    expect(a.positions.a).toEqual([0, 112, 0]);
    expect(a.positions.b).toEqual([48, 168, 0]);
  });

  it('clears all state', () => {
    const layout = make();
    layout.place({ id: 'a', group: 't1' });
    layout.clear();
    expect(layout.positions).toEqual({});
    expect(layout.place({ id: 'b', group: 't2' })[0]).toBe(0);
  });
});
