import type { Position } from './placement';

export type LayoutBounds = { min: Position; max: Position };

export const ZERO_BOUNDS: LayoutBounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };

/** Axis-aligned bounds of the placed positions, or zero bounds when there are none. */
export const boundsOf = (points: readonly Position[]): LayoutBounds => {
    const first = points[0];

    if (!first) return ZERO_BOUNDS;

    const min = { x: first.x, y: first.y, z: first.z };
    const max = { x: first.x, y: first.y, z: first.z };

    for (let i = 1; i < points.length; i++) {
        const point = points[i]!;
        min.x = Math.min(min.x, point.x);
        min.y = Math.min(min.y, point.y);
        min.z = Math.min(min.z, point.z);
        max.x = Math.max(max.x, point.x);
        max.y = Math.max(max.y, point.y);
        max.z = Math.max(max.z, point.z);
    }

    return { min, max };
};

export const boundsOfMap = (positions: ReadonlyMap<string, Position>): LayoutBounds =>
    boundsOf([...positions.values()]);
