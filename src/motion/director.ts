// P4.1. The director owns verb ordering, timing, easing, stagger and reduced motion. A host registers
// handlers that mutate emphasis or camera state only; canonical node positions are never an output.

import { MOTION_EASINGS, type MotionEase } from './easing';

export const MOTION_VERBS = [
    'arrive',
    'emphasize',
    'trace',
    'flyTo',
    'sweep',
    'follow',
    'decay',
    'compact',
] as const;
export type MotionVerb = (typeof MOTION_VERBS)[number];

export const MOTION_TARGETS = ['emphasis', 'camera'] as const;
export type MotionTarget = (typeof MOTION_TARGETS)[number];

/** One step of a named motion. `from`/`to` are the channel values the host handler receives. */
export interface MotionStep {
    readonly id: string;
    readonly verb: MotionVerb;
    readonly target: MotionTarget;
    readonly from: number;
    readonly to: number;
    readonly duration?: number;
    readonly delay?: number;
}

/** Host-supplied policy. No verb, timing, easing or preference is a library default choice. */
export interface MotionDirectorOptions {
    readonly ease?: MotionEase;
    readonly duration?: number;
    readonly stagger?: number;
    readonly reducedMotion?: boolean;
}

export interface MotionFrame {
    readonly step: MotionStep;
    /** Eased progress in [0, 1] for standard curves; spring curves may overshoot. */
    readonly progress: number;
    readonly value: number;
    /** Absolute director time in seconds. */
    readonly time: number;
}

export interface MotionPlayback {
    advance(seconds: number): readonly MotionFrame[];
    finish(): readonly MotionFrame[];
    readonly done: boolean;
    readonly active: readonly string[];
    readonly frames: readonly MotionFrame[];
    readonly duration: number;
}

interface ScheduledStep {
    readonly step: MotionStep;
    readonly start: number;
    readonly duration: number;
}

function schedule(steps: readonly MotionStep[], options: MotionDirectorOptions): ScheduledStep[] {
    return steps.map((step, index) => ({
        step,
        start: step.delay ?? index * (options.stagger ?? 0),
        duration: step.duration ?? options.duration ?? 0.5,
    }));
}

/**
 * Play named verbs against a host clock. `onFrame` is called once per step per advance; reduced motion
 * emits only the final frame of every step, so visually identical state is reached without animation.
 */
export function playMotion(
    steps: readonly MotionStep[],
    onFrame: (frame: MotionFrame) => void,
    options: MotionDirectorOptions = {},
): MotionPlayback {
    const ease = MOTION_EASINGS[options.ease ?? 'power2.out'];
    const scheduled = schedule(steps, options);
    const duration = scheduled.reduce(
        (end, entry) => Math.max(end, entry.start + Math.max(0, entry.duration)),
        0,
    );
    let remaining = options.reducedMotion ? [] : [...scheduled];
    let time = 0;
    const frames: MotionFrame[] = [];

    const emit = (entry: ScheduledStep, t: number): MotionFrame => {
        const progress = entry.duration > 0 ? ease(t) : 1;
        const frame: MotionFrame = {
            step: entry.step,
            progress,
            value: entry.step.from + (entry.step.to - entry.step.from) * progress,
            time,
        };
        frames.push(frame);
        onFrame(frame);
        return frame;
    };

    if (options.reducedMotion) for (const entry of scheduled) emit(entry, 1);

    return {
        duration,
        get done() {
            return remaining.length === 0;
        },
        get active() {
            return remaining.map((entry) => entry.step.id);
        },
        frames,
        advance(seconds: number) {
            time += Math.max(0, seconds);
            const emitted: MotionFrame[] = [];
            remaining = remaining.filter((entry) => {
                if (time < entry.start) return true;
                const t = Math.min(1, (time - entry.start) / Math.max(entry.duration, 1e-6));
                emitted.push(emit(entry, t));
                return t < 1;
            });
            return emitted;
        },
        finish() {
            const emitted = remaining.map((entry) => emit(entry, 1));
            remaining = [];
            return emitted;
        },
    };
}

/** A host registers the visual behavior of each verb; unregistered verbs degrade to no visual output. */
export class MotionDirector {
    readonly #handlers = new Map<MotionVerb, (frame: MotionFrame) => void>();

    register(verb: MotionVerb, handler: (frame: MotionFrame) => void): this {
        this.#handlers.set(verb, handler);
        return this;
    }

    verbs(): readonly MotionVerb[] {
        return [...this.#handlers.keys()];
    }

    play(steps: readonly MotionStep[], options: MotionDirectorOptions = {}): MotionPlayback {
        return playMotion(steps, (frame) => this.#handlers.get(frame.step.verb)?.(frame), options);
    }
}
