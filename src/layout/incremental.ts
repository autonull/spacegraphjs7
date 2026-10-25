// The seam between two layout results. A host derives the next layout, then asks what changed:
// which boxes are new, which disappeared, and which kept their place. Time is never stored here —
// a renderer interpolates `moved` from its own clock, so the layout stays pure and endpoints are
// exact at t=0 and t=1.

import type { Position } from './placement';

export type LayoutMove = {
    id: string;
    from: Position;
    to: Position;
};

export type IncrementalLayout = {
    positions: ReadonlyMap<string, Position>;
    added: ReadonlyMap<string, Position>;
    removed: readonly string[];
    /** Exactly the ids both layouts place differently. */
    moved: ReadonlyMap<string, LayoutMove>;
};

export const interpolatePosition = (from: Position, to: Position, t: number): Position => ({
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    z: (from.z ?? 0) + ((to.z ?? 0) - (from.z ?? 0)) * t,
});

export const computeIncremental = (
    positions: ReadonlyMap<string, Position>,
    previous?: ReadonlyMap<string, Position>,
): IncrementalLayout => {
    if (previous === undefined) {
        return {
            positions,
            added: new Map(positions),
            removed: [],
            moved: new Map(),
        };
    }

    const added = new Map([...positions].filter(([id]) => !previous.has(id)));
    const removed = [...previous.keys()].filter((id) => !positions.has(id));
    const moved = new Map<string, LayoutMove>();
    for (const [id, to] of positions) {
        const from = previous.get(id);
        if (!from) continue;
        if (from.x === to.x && from.y === to.y && from.z === to.z) continue;
        moved.set(id, { id, from, to });
    }
    return { positions, added, removed, moved };
};

export const diffPositions = computeIncremental;

/**
 * Applies the clock to one incremental result. Ids without a move keep their target position;
 * ids that moved are interpolated. The same `t` is valid for any number of views.
 */
export const interpolatedPositions = (
    layout: IncrementalLayout,
    t: number,
): ReadonlyMap<string, Position> => {
    if (t >= 1) return layout.positions;
    const result = new Map<string, Position>();
    for (const [id, to] of layout.positions) {
        const move = layout.moved.get(id);
        result.set(id, move ? interpolatePosition(move.from, move.to, t) : to);
    }
    return result;
};
