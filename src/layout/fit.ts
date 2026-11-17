// Camera fit is a host policy: a declared-empty turn keeps its column in the layout, but it must
// not widen the frame the camera fits. These helpers separate the two without changing placement.

import type { Position } from './placement';
import type { LayoutBounds } from './strategies';

const zeroBounds = (): LayoutBounds => ({
    min: { x: 0, y: 0, z: 0 },
    max: { x: 0, y: 0, z: 0 },
});

/** Ids a layout declared as empty placeholders, e.g. a turn that drew no nodes. */
export function declaredEmpty(
    items: readonly { readonly id: string; readonly meta?: { readonly empty?: boolean } }[],
): ReadonlySet<string> {
    return new Set(items.filter((item) => item.meta?.empty).map((item) => item.id));
}

/** Bounds of the drawn content only; empty placeholders never pull the frame outward. */
export function contentBounds(
    positions: ReadonlyMap<string, Position>,
    empty: ReadonlySet<string> = new Set(),
): LayoutBounds {
    const points = [...positions].flatMap(([id, point]) => (empty.has(id) ? [] : [point]));
    if (points.length === 0) return zeroBounds();

    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const zs = points.map((point) => point.z);
    return {
        min: { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) },
        max: { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) },
    };
}
