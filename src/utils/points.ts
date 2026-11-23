import { TAU } from './math';

export type Point3 = [number, number, number];
export type PointPlane = 'xz' | 'xy';

export interface RingOptions {
    /** The plane the circle lies in. Builders use XZ; spec generators use XY. */
    plane?: PointPlane;
    phase?: number;
    center?: readonly [number, number];
}

const inPlane = (a: number, b: number, plane: PointPlane): Point3 =>
    plane === 'xz' ? [a, 0, b] : [a, b, 0];

/** A point at `angle` radians and `radius`, in the chosen plane. */
export const polarPoint = (angle: number, radius: number, plane: PointPlane = 'xz'): Point3 =>
    inPlane(Math.cos(angle) * radius, Math.sin(angle) * radius, plane);

/** The `index`th of `count` evenly spaced points on a circle. */
export const ringPoint = (
    index: number,
    count: number,
    radius: number,
    { plane = 'xz', phase = 0, center = [0, 0] }: RingOptions = {},
): Point3 => {
    const point = polarPoint(index * (TAU / count) + phase, radius, plane);
    point[0] += center[0];
    point[plane === 'xz' ? 2 : 1] += center[1];
    return point;
};

export const ringPoints = (count: number, radius: number, options: RingOptions = {}): Point3[] =>
    Array.from({ length: count }, (_, index) => ringPoint(index, count, radius, options));

/** The `index`th row-major point of a grid. */
export const gridPoint = (
    index: number,
    cols: number,
    spacing = 100,
    origin: readonly [number, number] = [0, 0],
    plane: PointPlane = 'xz',
): Point3 =>
    inPlane(
        origin[0] + (index % cols) * spacing,
        origin[1] + Math.floor(index / cols) * spacing,
        plane,
    );

export const gridPoints = (
    rows: number,
    cols: number,
    spacing = 100,
    origin: readonly [number, number] = [0, 0],
    plane: PointPlane = 'xz',
): Point3[] =>
    Array.from({ length: rows * cols }, (_, index) =>
        gridPoint(index, cols, spacing, origin, plane),
    );
