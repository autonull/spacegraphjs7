// Host-composed camera verbs. The library interpolates camera points for `flyTo` and `trace`; hosts
// own viewport state, the flight target, the trace polyline and the final camera move. The remaining
// motion verbs are reported unsupported rather than silently ignored.

import { MOTION_VERBS, type MotionDirector, type MotionVerb } from './director';

export type CameraPoint = readonly [number, number, number];

export interface CameraMotionAdapter {
    /** Camera point at the start of a flight. */
    origin(): CameraPoint;
    /** Destination of the active flight; undefined means no flight is active. */
    destination(): CameraPoint | undefined;
    /** Zoom held constant during a flight. */
    zoom(): number;
    /** Node positions of the active trace, in visit order. */
    tracePath(): readonly CameraPoint[];
    /** Apply an interpolated camera point. */
    move(verb: 'flyTo' | 'trace', point: CameraPoint, progress: number): void;
}

export const CAMERA_MOTION_VERBS = ['flyTo', 'trace'] as const;
export type CameraMotionVerb = (typeof CAMERA_MOTION_VERBS)[number];

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

export const interpolatePoint = (from: CameraPoint, to: CameraPoint, t: number): CameraPoint => [
    lerp(from[0], to[0], t),
    lerp(from[1], to[1], t),
    lerp(from[2], to[2], t),
];

/** Point at normalized position `value` along the trace polyline. */
export const pointOnTrace = (
    path: readonly CameraPoint[],
    value: number,
): CameraPoint | undefined => {
    const index = Math.floor(value);
    const from = path[index];
    if (!from) return undefined;
    return interpolatePoint(from, path[index + 1] ?? from, value - index);
};

export interface CameraMotionHandlers {
    readonly verbs: readonly CameraMotionVerb[];
    reportUnsupported(): readonly { readonly id: MotionVerb; readonly reason: string }[];
}

/** Register `flyTo`/`trace` on a host director; every other verb is reported unsupported. */
export function createCameraMotionHandlers(
    director: Pick<MotionDirector, 'register'>,
    adapter: CameraMotionAdapter,
): CameraMotionHandlers {
    const registered = new Set<MotionVerb>(CAMERA_MOTION_VERBS);

    director.register('flyTo', ({ progress }) => {
        const destination = adapter.destination();
        if (!destination) return;
        adapter.move('flyTo', interpolatePoint(adapter.origin(), destination, progress), progress);
    });
    director.register('trace', ({ value }) => {
        const point = pointOnTrace(adapter.tracePath(), value);
        if (!point) return;
        adapter.move('trace', point, value);
    });

    return {
        verbs: CAMERA_MOTION_VERBS,
        reportUnsupported: () =>
            MOTION_VERBS.filter((verb) => !registered.has(verb)).map((verb) => ({
                id: verb,
                reason: `No camera handler registered for '${verb}'.`,
            })),
    };
}
