// utils/index.ts - Consolidated utility exports
// All utilities re-exported from single source for better tree-shaking

// Re-export constants from core (includes math constants)
export {
    DEG2RAD, RAD2DEG, PI, TAU, EPSILON, RAD, DEG,
    AnimationDuration, ZoomConfig, FingeringPriority,
    InteractionThresholds, Performance, Defaults,
    EdgeColors, WCAG, InputConfig,
    DUR, ZOOM, FINGER, THRESH, PERF, DEF, COLORS, CONSTANTS,
    Spatial, NodeDefaults, LayoutDefaults, Easing,
} from '../core/constants';

// Math utilities (from math.ts) - excluding constants which come from core
export {
    // Type guards
    isObject,
    isFunction,
    isString,
    isNumber,
    isBoolean,
    isArray,
    isPlainObject,
    isDefined,

    // Math functions
    clamp,
    clamp01,
    lerp,
    lerpClamped,
    inverseLerp,
    smoothstep,
    smootherstep,
    mapRange,
    round,
    approx,
    sign,
    abs,
    min,
    max,
    sum,
    mean,

    // Vector math
    lerp3,
    min3,
    max3,
    clamp180,
    angleDiff,
    randomThreeVector,

    // Random
    randomRange,
    randomInt,
    randomBool,
    randomPick,

    // Object utilities
    safeClone,
    deepEqual,
} from './math';

// Color
export type { ColorStop } from './color';
export {
    hexToRgb,
    rgbToHex,
    toHexColor,
    getRelativeLuminance,
    getContrastRatio,
    getCompliantColor,
    lerpColor,
    lerpColorHex,
    blendColors,
    hexToHsl,
    hslToHex,
    adjustHue,
    adjustSaturation,
    adjustLightness,
    darken,
    lighten,
    saturate,
    desaturate,
    generateGradient,
    generatePalette,
    generateGradientPalette,
    toCssGradient,
    parseColor,
} from './color';

// Logger
export { logger, createLogger, setLogLevel } from './logger';
export type { LogLevel, Logger } from './logger';

// Camera utilities
export { calculateFitView } from './CameraUtils';
export type { FitViewResult, Point } from './CameraUtils';

// DOM utilities
export { createElement, createElementNS, DOMUtils } from './DOMUtils';
export type { DOMElementOptions } from './DOMUtils';

// Performance utilities
export {
    PerformanceMonitor,
    ObjectPool,
    batch,
    batchAsync,
    requestIdleCallbackPolyfill,
    cancelIdleCallbackPolyfill,
    throttleByTime,
    debounceByTime,
    getMemoryUsage,
    measure,
    measureAsync,
} from './performance';

// Error utilities - unified error handling
export {
    wrapError,
    SpaceGraphError,
    NotImplementedError,
    ValidationError,
    ConfigurationError,
    createErrorFactory,
} from './error';
export type { SpaceGraphErrorOptions } from './error';

// Gesture utilities
export {
    calculateDistance,
    calculateMidpoint,
    calculatePinchZoom,
    calculatePan,
    calculateAngle,
    isClick,
    normalizeWheel,
} from './GestureManager';
export type { Point as GesturePoint, DragCallback, PinchCallback, RotateCallback } from './GestureManager';

// Graph generators
export { randomTree, randomMesh, scaleFreeGraph, smallWorld, lattice2D } from './graphGenerators';

// Three.js disposal
export { ThreeDisposer } from './ThreeDisposer';