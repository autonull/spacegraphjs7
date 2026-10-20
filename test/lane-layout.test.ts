// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { LaneLayout } from '../src/layout/LaneLayout';

const LANES = ['prompt', 'narrative', 'explore', 'edit', 'verify', 'delegate', 'artifacts'];

const make = () => new LaneLayout({ lanes: LANES, lanePitch: 56, step: 48, groupGap: 320, depthStep: 64 });

describe('LaneLayout', () => {
    it('maps lane index to Y', () => {
        const layout = make();
        expect(layout.place({ id: 'a', lane: 'explore' })[1]).toBe(2 * 56);
        expect(layout.place({ id: 'b', lane: 'artifacts' })[1]).toBe(6 * 56);
        expect(layout.place({ id: 'c', lane: 'missing' })[1]).toBe(0);
    });

    it('advances a row by the widths of the items it holds', () => {
        const layout = make();
        expect(layout.place({ id: 'a', lane: 'explore', width: 100 })).toEqual([50, 112, 0]);
        expect(layout.place({ id: 'b', lane: 'explore', width: 200 })).toEqual([248, 112, 0]);
    });

    it('gives every row its own cursor', () => {
        const layout = make();
        layout.place({ id: 'a', lane: 'explore', width: 100 });
        expect(layout.place({ id: 'b', lane: 'edit', width: 100 })[0]).toBe(50);
    });

    it('records the depth on Z', () => {
        const layout = make();
        expect(layout.place({ id: 'a', lane: 'explore', depth: 2 })[2]).toBe(128);
    });

    it('indents an item inside its column', () => {
        const layout = make();
        expect(layout.place({ id: 'a', lane: 'explore', indent: 120, width: 200 })[0]).toBe(220);
    });

    it('numbers the rows itself when the host has no lane names', () => {
        const layout = new LaneLayout({ lanePitch: 20, step: 8 });
        expect(layout.place({ id: 'a', row: 2 })).toEqual([0, 40, 0]);
    });

    it('places the same id once', () => {
        const layout = make();
        const first = layout.place({ id: 'a', lane: 'explore', width: 100 });
        expect(layout.place({ id: 'a', lane: 'verify', width: 900 })).toBe(first);
    });

    it('opens a column where the previous one ended', () => {
        const layout = make();
        layout.open('t1');
        layout.place({ id: 'a', lane: 'explore', group: 't1', width: 100 });
        layout.close('t1', 100);
        layout.open('t2');
        expect(layout.place({ id: 'b', lane: 'explore', group: 't2', width: 100 })[0]).toBe(470);
    });

    it('measures a column from the widest row it holds', () => {
        const layout = make();
        layout.open('t1');
        layout.place({ id: 'a', lane: 'explore', group: 't1', width: 100 });
        layout.place({ id: 'b', lane: 'edit', group: 't1', width: 300 });
        expect(layout.width('t1')).toBe(300);
    });

    it('computes bounds over a subset', () => {
        const layout = make();
        layout.placeAll([
            { id: 'a', lane: 'explore', width: 100 },
            { id: 'b', lane: 'edit', width: 200 },
        ]);
        const bounds = layout.bounds(['a', 'b']);
        expect(bounds?.min).toEqual([50, 112, 0]);
        expect(bounds?.max).toEqual([100, 168, 0]);
        expect(bounds?.center).toEqual([75, 140, 0]);
        expect(bounds?.size).toEqual([50, 56, 0]);
        expect(layout.bounds([])).toBeUndefined();
    });

    it('is deterministic and append-only across instances', () => {
        const items = [
            { id: 'a', lane: 'explore', width: 100 },
            { id: 'b', lane: 'edit', width: 200 },
            { id: 'c', lane: 'verify', width: 100 },
        ];
        const a = make();
        const b = make();
        a.placeAll(items);
        b.placeAll(items);
        expect(a.positions).toEqual(b.positions);
        a.place({ id: 'd', lane: 'artifacts', width: 100 });
        expect(a.positions.a).toEqual([50, 112, 0]);
        expect(a.positions.b).toEqual([100, 168, 0]);
    });

    it('clears all state', () => {
        const layout = make();
        layout.open('t1');
        layout.place({ id: 'a', lane: 'explore', group: 't1', width: 100 });
        layout.close('t1', 100);
        layout.clear();
        expect(layout.positions).toEqual({});
        layout.open('t2');
        expect(layout.place({ id: 'b', lane: 'explore', group: 't2', width: 100 })[0]).toBe(50);
    });
});
