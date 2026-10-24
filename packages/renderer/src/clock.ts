/**
 * The renderer half of the incremental-layout clock.
 *
 * Layout results carry moves over world positions; this module turns one move set plus a scalar
 * `t` into a `RenderModel`. Time never lives in the model: a host owns the clock and calls
 * `advance(t)`, so a static render, a reduced-motion jump (`t = 1`), and a test all use the same
 * deterministic path.
 */

import type { RenderModel, RenderNode } from './index';

export type RenderMove = {
    id: string;
    from: [number, number, number];
    to: [number, number, number];
};

export type RenderClock = {
    /** The model at `t = 1`. Renderers receive this once the motion settles. */
    readonly model: RenderModel;
    readonly moves: readonly RenderMove[];
    /** The model at time `t`, clamped to `[0, 1]`. `t = 0` reproduces `from`, `t = 1` reproduces `to`. */
    advance(t: number): RenderModel;
};

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

export const createRenderClock = (
    model: RenderModel,
    moves: readonly RenderMove[],
): RenderClock => {
    const byId = new Map(moves.map((move) => [move.id, move]));
    return {
        model,
        moves,
        advance(t) {
            if (moves.length === 0 || t >= 1) return model;
            const time = Math.max(0, t);
            const nodes: RenderNode[] = model.nodes.map((node) => {
                const move = byId.get(node.id);
                if (!move) return node;
                return {
                    ...node,
                    position: [
                        lerp(move.from[0], move.to[0], time),
                        lerp(move.from[1], move.to[1], time),
                        lerp(move.from[2], move.to[2], time),
                    ],
                };
            });
            return { ...model, nodes };
        },
    };
};
