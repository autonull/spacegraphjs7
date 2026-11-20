// The adaptive seam between host signals and scope geometry. A policy translates zoom, focus and
// vision scores into activation, a pin set, and solver parameters. It owns no state and imports no
// vision types, so any host can feed it from its own analyzer.

import { scopeAncestors, type ScopeTree } from './scope';
import { activeScopePaths, type ScopeLayoutOptions, type ScopeSignals } from './scope-layout';

export interface ScopeVisionSignal {
    /** 0..1 overlap severity; higher gives the solvers more room. */
    overlap?: number;
    /** 0..1 legibility score; lower gives labels more padding. */
    legibility?: number;
}

export interface ScopePolicyInput extends ScopeSignals {
    vision?: ScopeVisionSignal;
}

export interface ScopePolicy {
    active: ReadonlySet<string>;
    /** The focused node plus every scope that owns it. */
    pinned: ReadonlySet<string>;
    layout: ScopeLayoutOptions;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** Derive activation, stability and solver settings from the current host signals. */
export function scopePolicy(
    tree: ScopeTree,
    input: ScopePolicyInput,
    base: ScopeLayoutOptions = {},
): ScopePolicy {
    const active = activeScopePaths(tree, input);
    const pinned = new Set<string>();
    if (input.focus) {
        pinned.add(input.focus);
        for (const ancestor of scopeAncestors(tree, input.focus)) pinned.add(ancestor.path);
    }

    const overlap = clamp01(input.vision?.overlap ?? 0);
    const legibility = clamp01(input.vision?.legibility ?? 1);
    const gap = (base.gap ?? 160) * (1 + overlap * 1.5);
    const nodePadding = (base.nodePadding ?? 20) * (1 + (1 - legibility) * 2);

    return {
        active,
        pinned,
        layout: { ...base, gap, nodePadding },
    };
}
