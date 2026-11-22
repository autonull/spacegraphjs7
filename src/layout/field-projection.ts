import type { ScopeLayout } from './scope-layout';

/** Screen-space rectangle for one solved scope frame. */
export interface FieldRect {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/** A host supplies the projection; the mapping itself stays pure and renderer-independent. */
export type FieldProjector = (point: { readonly x: number; readonly y: number; readonly z: number }) =>
    | { readonly x: number; readonly y: number }
    | undefined;

/**
 * Map solved scope frames to screen rectangles. Fields follow the layout target, not the animated
 * body, so a scope frame stays square while its cards settle. A renderer that cannot project a world
 * point simply yields no rect; the host then keeps its own overlay path.
 */
export const scopeFieldRects = (
    layout: ScopeLayout | undefined,
    project: FieldProjector,
    padding = 0,
): ReadonlyMap<string, FieldRect> => {
    const rects = new Map<string, FieldRect>();
    if (!layout) return rects;
    for (const [id, frame] of layout.frames) {
        const { bounds } = frame;
        const topLeft = project({ x: bounds.min.x - padding, y: bounds.max.y + padding, z: bounds.min.z });
        const bottomRight = project({ x: bounds.max.x + padding, y: bounds.min.y - padding, z: bounds.min.z });
        if (!topLeft || !bottomRight) continue;
        rects.set(id, {
            x: Math.min(topLeft.x, bottomRight.x),
            y: Math.min(topLeft.y, bottomRight.y),
            width: Math.max(1, Math.abs(bottomRight.x - topLeft.x)),
            height: Math.max(1, Math.abs(bottomRight.y - topLeft.y)),
        });
    }
    return rects;
};
