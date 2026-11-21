// The adaptive seam between host signals and scope geometry. A policy translates zoom, focus and
// vision scores into activation, a pin set, and solver parameters. It owns no state and imports no
// vision types, so any host can feed it from its own analyzer.

import { clamp01 } from '../utils/math';
import { scopeAncestors, type ScopeTree } from './scope';
import { activeScopePaths, type ScopeLayoutOptions, type ScopeSignals } from './scope-layout';

export interface ScopeVisionSignal {
    /** 0..1 overlap severity; higher gives the solvers more room. */
    overlap?: number;
    /** 0..1 legibility score; lower gives labels more padding. */
    legibility?: number;
    /** 0..1 hierarchy quality; lower gives scopes more depth separation. */
    hierarchy?: number;
    /** 0..1 target-size quality; lower gives nodes more padding. */
    ergonomics?: number;
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
    const ergonomics = clamp01(input.vision?.ergonomics ?? 1);
    const gap = (base.gap ?? 160) * (1 + overlap * 1.5);
    const nodePadding =
        (base.nodePadding ?? 20) * (1 + (1 - legibility) * 2 + (1 - ergonomics) * 2);
    const layout: ScopeLayoutOptions = { ...base, gap, nodePadding };
    if (input.vision?.hierarchy !== undefined) {
        layout.depthStep =
            (base.depthStep ?? 220) * (1 + (1 - clamp01(input.vision.hierarchy)) * 0.5);
    }

    return { active, pinned, layout };
}
