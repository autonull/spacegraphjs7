import { describe, expect, test } from 'bun:test';
import { createRenderClock } from './clock';
import type { RenderModel } from './index';

const model: RenderModel = {
    nodes: [
        { id: 'a', kind: 'node', label: 'A', position: [100, 40, 10] },
        { id: 'b', kind: 'node', label: 'B', position: [20, 20, 0] },
    ],
    edges: [],
};

const moves = [
    {
        id: 'a',
        from: [0, 0, 0] as [number, number, number],
        to: [100, 40, 10] as [number, number, number],
    },
];

describe('renderer clock', () => {
    test('endpoints are exact', () => {
        const clock = createRenderClock(model, moves);
        expect(clock.advance(0).nodes[0].position).toEqual([0, 0, 0]);
        expect(clock.advance(1).nodes[0].position).toEqual([100, 40, 10]);
        expect(clock.model.nodes[0].position).toEqual([100, 40, 10]);
    });

    test('t interpolates every axis and leaves still nodes untouched', () => {
        const clock = createRenderClock(model, moves);
        const half = clock.advance(0.5);
        expect(half.nodes[0].position).toEqual([50, 20, 5]);
        expect(half.nodes[1]).toBe(model.nodes[1]);
    });

    test('time is always an argument, never stored', () => {
        const clock = createRenderClock(model, moves);
        expect(clock.advance(0.25).nodes[0].position).toEqual([25, 10, 2.5]);
        expect(clock.advance(0.75).nodes[0].position).toEqual([75, 30, 7.5]);
        expect(clock.advance(0.25).nodes[0].position).toEqual([25, 10, 2.5]);
    });

    test('the clock clamps before zero and settles at or after one', () => {
        const clock = createRenderClock(model, moves);
        expect(clock.advance(-2).nodes[0].position).toEqual([0, 0, 0]);
        expect(clock.advance(1.5)).toBe(model);
    });

    test('no moves is the identity', () => {
        const clock = createRenderClock(model, []);
        expect(clock.advance(0)).toBe(model);
        expect(clock.advance(0.5)).toBe(model);
    });
});
