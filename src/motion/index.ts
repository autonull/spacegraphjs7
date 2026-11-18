// `spacegraphjs/motion` — host-composed motion direction. Pure and dependency-free: the host owns
// verbs, timing, easing, reduced motion and the camera adapter (P4.1-P4.2).

export { MOTION_VERBS, MotionDirector, playMotion } from './director';
export type {
    MotionDirectorOptions,
    MotionFrame,
    MotionPlayback,
    MotionStep,
    MotionTarget,
    MotionVerb,
} from './director';
export {
    CAMERA_VERBS,
    CameraVerbRegistry,
    DEFAULT_CAMERA_POLICY,
    contentZoomBounds,
    orbitEnabled,
} from './camera';
export type {
    CameraAdapter,
    CameraCommand,
    CameraHandler,
    CameraPolicy,
    CameraVerb,
} from './camera';
export { MOTION_EASINGS, SPRING_PRESETS, springEasing } from './easing';
export type { MotionEase, SpringConfig } from './easing';
