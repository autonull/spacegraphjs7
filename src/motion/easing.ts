// P4.1. Pure easing curves: the gsap-equivalent set shared with representation playback plus analytic
// spring responses. No gsap, DOM or wall clock dependency.

import { springPresets } from '@spacegraphjs/shared';
import { REPRESENTATION_EASINGS } from '../representations/playback';

export interface SpringConfig {
    readonly stiffness: number;
    readonly damping: number;
    readonly mass: number;
}

/** The shared spring presets, re-exported for core consumers. */
export const SPRING_PRESETS = springPresets;

/** A normalized damped-spring step response. Overshoot is deliberate; hosts clamp the output channel. */
export function springEasing(config: SpringConfig): (t: number) => number {
    const omega = Math.sqrt(config.stiffness / config.mass);
    const zeta = config.damping / (2 * Math.sqrt(config.stiffness * config.mass));
    const wd = omega * Math.sqrt(Math.max(1 - zeta * zeta, 1e-6));
    const response = (t: number) =>
        1 -
        Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
    const end = response(1) || 1;
    return (t) => response(t) / end;
}

export const MOTION_EASINGS = {
    ...REPRESENTATION_EASINGS,
    'spring.gentle': springEasing(SPRING_PRESETS.gentle),
    'spring.smooth': springEasing(SPRING_PRESETS.smooth),
    'spring.snappy': springEasing(SPRING_PRESETS.snappy),
    'spring.bouncy': springEasing(SPRING_PRESETS.bouncy),
} as const;

export type MotionEase = keyof typeof MOTION_EASINGS;
