import { describe, expect, test } from 'vitest';
import {
    computeIncremental,
    diffPositions,
    interpolatePosition,
    interpolatedPositions,
} from '../../src/layout/incremental';
import type { Position } from '../../src/layout/placement';
import { SpatialIndex2D } from '../../packages/kernel/src/spatial';
import { applyNodeBudget } from '../../packages/kernel/src/budget';
import { Kernel } from '../../packages/kernel/src/kernel';

const position = (x: number, y: number, z = 0): Position => ({ x, y, z });

describe('incremental layout', () => {
    test('a first layout reports every position as added', () => {
        const next = new Map([
            ['a', position(0, 0)],
            ['b', position(10, 0)],
        ]);
        const incremental = computeIncremental(next);

        expect([...incremental.added.keys()]).toEqual(['a', 'b']);
        expect(incremental.removed).toEqual([]);
        expect(incremental.moved.size).toBe(0);
    });

    test('stable ids keep their positions and moved is the symmetric difference', () => {
        const previous = new Map([
            ['a', position(0, 0)],
            ['b', position(10, 0)],
            ['gone', position(20, 0)],
        ]);
        const next = new Map([
            ['a', position(0, 0)],
            ['b', position(30, 4)],
            ['new', position(40, 0)],
        ]);
        const incremental = computeIncremental(next, previous);

        expect([...incremental.added.keys()]).toEqual(['new']);
        expect(incremental.removed).toEqual(['gone']);
        expect([...incremental.moved.keys()]).toEqual(['b']);
        expect(incremental.moved.get('b')).toEqual({
            id: 'b',
            from: position(10, 0),
            to: position(30, 4),
        });
        expect(incremental.positions.get('a')).toEqual(position(0, 0));
    });

    test('the clock is an argument: endpoints are exact and the model stays time-independent', () => {
        const previous = new Map([['a', position(0, 0)]]);
        const next = new Map([['a', position(100, 40)]]);
        const incremental = computeIncremental(next, previous);

        expect(interpolatePosition(position(0, 0), position(100, 40), 0)).toEqual(position(0, 0));
        expect(interpolatePosition(position(0, 0), position(100, 40), 1)).toEqual(
            position(100, 40),
        );

        const start = interpolatedPositions(incremental, 0);
        const middle = interpolatedPositions(incremental, 0.5);
        const end = interpolatedPositions(incremental, 1);

        expect(start.get('a')).toEqual(position(0, 0));
        expect(middle.get('a')).toEqual(position(50, 20));
        expect(end.get('a')).toEqual(position(100, 40));
        expect(incremental.positions.get('a')).toEqual(position(100, 40));
    });

    test('one moved set interpolates any number of views with the same clock', () => {
        const incremental = diffPositions(
            new Map([['a', position(40, 0)]]),
            new Map([['a', position(0, 0)]]),
        );

        expect(interpolatedPositions(incremental, 0.25)).toEqual(
            interpolatedPositions(incremental, 0.25),
        );
        expect(interpolatedPositions(incremental, 0.25).get('a')).toEqual(position(10, 0));
    });

    test('the spatial index follows interpolated positions mid-flight', () => {
        const incremental = diffPositions(
            new Map([
                ['a', position(100, 0)],
                ['b', position(0, 0)],
            ]),
            new Map([
                ['a', position(0, 0)],
                ['b', position(0, 0)],
            ]),
        );

        const indexAt = (t: number) => {
            const positions = interpolatedPositions(incremental, t);
            return new SpatialIndex2D(
                [...positions].map(([id, point]) => ({ id, x: point.x, y: point.y })),
            );
        };

        expect(indexAt(0).near(0, 0, 1)).toEqual(['a', 'b']);
        expect(indexAt(0.5).near(50, 0, 1)).toEqual(['a']);
        expect(indexAt(0.5).near(0, 0, 1)).toEqual(['b']);
        expect(indexAt(1).near(100, 0, 1)).toEqual(['a']);
    });

    test('a budget keeps a protected node and the index finds it mid-flight', () => {
        const incremental = diffPositions(
            new Map([
                ['a', position(100, 0)],
                ['b', position(0, 0)],
                ['c', position(0, 100)],
            ]),
            new Map([
                ['a', position(0, 0)],
                ['b', position(0, 0)],
                ['c', position(0, 100)],
            ]),
        );
        const kernel = new Kernel({
            nodes: [
                { id: 'a', kind: 'tool', label: 'A' },
                { id: 'b', kind: 'message', label: 'B' },
                { id: 'c', kind: 'session', label: 'C' },
            ],
            edges: [],
            hyperedges: [],
        });
        const budgeted = applyNodeBudget(kernel, {
            maxNodes: 2,
            weights: { session: 1000, message: 100, tool: 10 },
            protectedIds: ['a'],
        });
        const positions = interpolatedPositions(incremental, 0.5);
        const index = new SpatialIndex2D(
            budgeted.nodes.map((node) => {
                const point = positions.get(node.id)!;
                return { id: node.id, x: point.x, y: point.y };
            }),
        );

        expect(budgeted.nodes.map((node) => node.id).sort()).toEqual(['a', 'c']);
        expect(index.near(50, 0, 1)).toEqual(['a']);
    });

    test('seeded cases never move an id both layouts place identically', () => {
        for (let seed = 0; seed < 20; seed += 1) {
            const previous = new Map(
                Array.from({ length: 6 }, (_, index) => [
                    `n${index}`,
                    position(seed * 3 + index * 7, index * 5),
                ]),
            );
            const next = new Map(previous);
            next.set('n0', position(seed, seed));
            next.set('n1', position(previous.get('n1')!.x, previous.get('n1')!.y));
            const incremental = computeIncremental(next, previous);

            for (const [id, move] of incremental.moved) {
                expect(move.from).not.toEqual(move.to);
                expect(next.get(id)).toEqual(move.to);
            }
        }
    });
});
