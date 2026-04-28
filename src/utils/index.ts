// utils/index.ts - Consolidated utility exports
// All utilities re-exported from single source for better tree-shaking

// Math utilities (consolidated)
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

  // Color (consolidated from color.ts)
  getRelativeLuminance,
  getContrastRatio,
  getCompliantColor,
  hexToRgb,
  rgbToHex,
  toHexColor,

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

  // Error handling
  wrapError,

  // Type utilities
  isDefined,
} from './math';

// Logger
export { logger, createLogger, setLogLevel } from './logger';
export type { LogLevel, Logger } from './logger';

// Camera utilities
export { calculateFitView, CameraUtils } from './CameraUtils';
export type { FitViewResult, Point } from './CameraUtils';

// DOM utilities
export { createElement, createElementNS, DOMUtils } from './DOMUtils';
export type { DOMElementOptions } from './DOMUtils';

// Performance utilities
export {
  PerformanceMonitor,
  ObjectPool,
  memoize as perfMemoize,
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

// Error utilities
export { wrapError as wrapErrorDetailed, SpaceGraphError, NotImplementedError, ValidationError, ConfigurationError } from './error';

// Gesture utilities
export { GestureManager } from './GestureManager';

// Graph generators (consolidated)
export {
  randomTree,
  randomMesh,
  scaleFreeGraph,
  smallWorld,
  lattice2D,
} from './graphGenerators';

// Three.js disposal
export { disposeThreeObject } from './ThreeDisposer';
