import type { ConfigSpace } from './space';
import { ConfigState } from './state';
import type { ConfigValue } from './types';

/** One axis whose effective values differ between two states. */
export interface AxisDiff {
    readonly axis: string;
    readonly left: ConfigValue | undefined;
    readonly right: ConfigValue | undefined;
}

export function axisDiff(left: ConfigState, right: ConfigState): AxisDiff[] {
    return left.space.ids().flatMap((axis) => {
        const a = left.get(axis);
        const b = right.get(axis);
        return a === b ? [] : [{ axis, left: a, right: b }];
    });
}

/** Deterministic when given a seeded generator; used by the explorer and the capture matrix. */
export function randomize(space: ConfigSpace, random: () => number = Math.random): ConfigState {
    const overrides = Object.fromEntries(
        space.axes.flatMap((axis) => {
            const value = axis.values[Math.floor(random() * axis.values.length)];
            return value === undefined ? [] : [[axis.id, value] as const];
        }),
    );
    return ConfigState.from(space, overrides);
}

/** The host baseline: descriptor defaults with every flag and capability ignored. */
export function resetToBaseline(space: ConfigSpace): ConfigState {
    return ConfigState.from(space);
}
