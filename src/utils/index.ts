// utils/index.ts - Consolidated utility exports
// All utilities re-exported from single source for better tree-shaking

// Math utilities
export {
    // Constants
    DEG2RAD,
    RAD2DEG,
    PI,
    TAU,
    EPSILON,

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

    // Color
    hexToRgb,
    rgbToHex,
    toHexColor,
    getRelativeLuminance,
    getContrastRatio,
    getCompliantColor,

    // Object utilities
    mergeDeep,
    safeClone,
    deepEqual,

    // Function utilities
    debounce,
    throttle,

    // Memoization
    memoize,
    memoizeWithKey,
    invalidateMemoization,
    clearMemoization,

    // Array utilities
    groupBy,
    unique,
    flatten,
    chunk,

    // Promise utilities
    isPromise,
    sleep,
    retry,

    // Functional utilities
    pipe,
    compose,
    partial,
    curry,
    once,
    cacheWithTTL,
} from './math';

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
export { GestureManager } from './GestureManager';

// Graph generators
export { randomTree, randomMesh, scaleFreeGraph, smallWorld, lattice2D } from './graphGenerators';

// Three.js disposal
export { disposeThreeObject } from './ThreeDisposer';
