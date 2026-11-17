// P1.3. The library owns the clock, easing and stable ids of a representation swap; the host owns
// how one appearance interpolates into the next. No camera, renderer or gsap import lives here.

import type { RungChange } from './ladder';

/** Curves matching the easing names hosts already pass to gsap; kept pure for headless playback. */
export const REPRESENTATION_EASINGS = {
    linear: (t: number) => t,
    'power1.out': (t: number) => 1 - (1 - t) ** 2,
    'power2.out': (t: number) => 1 - (1 - t) ** 3,
    'power2.inOut': (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
} as const;

export type RepresentationEase = keyof typeof REPRESENTATION_EASINGS;

/** A swap as the host sees it: the id is stable from `from` to `to`. */
export type RepresentationTween = RungChange;

export interface RepresentationPlaybackOptions {
    readonly ease?: RepresentationEase;
    /** Reduced motion collapses every swap to its final frame. */
    readonly reducedMotion?: boolean;
}

export interface RepresentationPlayback {
    /** Advance by `seconds` and emit the eased value of every active swap. */
    advance(seconds: number): void;
    /** Jump to the final frame of every active swap. */
    finish(): void;
    readonly done: boolean;
    readonly active: readonly string[];
}

/**
 * Play stable-id swaps produced by `representationChanges`. `interpolate` receives the change and an
 * eased value in [0, 1]; the host decides which appearance channel that value drives.
 */
export function playRepresentationChanges(
    changes: readonly RepresentationTween[],
    interpolate: (change: RepresentationTween, value: number) => void,
    options: RepresentationPlaybackOptions = {},
): RepresentationPlayback {
    const ease = REPRESENTATION_EASINGS[options.ease ?? 'power2.out'];
    const instant = options.reducedMotion === true;
    const active = new Map<string, { change: RepresentationTween; elapsed: number }>(
        instant ? [] : changes.filter((change) => change.duration > 0).map((change) => [change.id, { change, elapsed: 0 }]),
    );

    if (instant) for (const change of changes) interpolate(change, 1);

    return {
        get done() {
            return active.size === 0;
        },
        get active() {
            return [...active.keys()];
        },
        advance(seconds: number) {
            for (const [id, entry] of active) {
                const elapsed = (entry.elapsed += Math.max(0, seconds));
                const t = Math.min(1, elapsed / entry.change.duration);
                interpolate(entry.change, ease(t));
                if (t === 1) active.delete(id);
            }
        },
        finish() {
            for (const [id, entry] of active) {
                interpolate(entry.change, 1);
                active.delete(id);
            }
        },
    };
}
