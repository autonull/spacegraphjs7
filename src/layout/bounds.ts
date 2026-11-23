import type { Position } from './placement';

export type LayoutBounds = { min: Position; max: Position };
export type CenterBounds = LayoutBounds & { center: Position; size: [number, number, number] };

export const ZERO_BOUNDS: LayoutBounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };

/** Build the min/max/centre/size view from six extents. */
export const boundsFromExtents = (
    minX: number,
    minY: number,
    minZ: number,
    maxX: number,
    maxY: number,
    maxZ: number,
): CenterBounds => ({
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
    size: [maxX - minX, maxY - minY, maxZ - minZ],
});

/** Accumulate extents over points; undefined when there are none. */
export const accumulateBounds = (points: Iterable<Position>): CenterBounds | undefined => {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let any = false;
    for (const point of points) {
        any = true;
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        minZ = Math.min(minZ, point.z);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
        maxZ = Math.max(maxZ, point.z);
    }
    return any ? boundsFromExtents(minX, minY, minZ, maxX, maxY, maxZ) : undefined;
};

/** Affinely move and scale the extents of a bounds value. */
export const transformBounds = (
    bounds: LayoutBounds,
    origin: Position,
    scale: number,
): CenterBounds =>
    boundsFromExtents(
        origin.x + bounds.min.x * scale,
        origin.y + bounds.min.y * scale,
        origin.z + bounds.min.z * scale,
        origin.x + bounds.max.x * scale,
        origin.y + bounds.max.y * scale,
        origin.z + bounds.max.z * scale,
    );

/** The smallest bounds enclosing both inputs. */
export const unionBounds = (a: LayoutBounds, b: LayoutBounds): CenterBounds =>
    boundsFromExtents(
        Math.min(a.min.x, b.min.x),
        Math.min(a.min.y, b.min.y),
        Math.min(a.min.z, b.min.z),
        Math.max(a.max.x, b.max.x),
        Math.max(a.max.y, b.max.y),
        Math.max(a.max.z, b.max.z),
    );

/** Axis-aligned bounds of the placed positions, or zero bounds when there are none. */
export const boundsOf = (points: readonly Position[]): LayoutBounds => {
    const accumulated = accumulateBounds(points);
    return accumulated ? { min: accumulated.min, max: accumulated.max } : ZERO_BOUNDS;
};

export const boundsOfMap = (positions: ReadonlyMap<string, Position>): LayoutBounds =>
    boundsOf([...positions.values()]);
