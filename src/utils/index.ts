// Utility functions - consolidated and optimized
// Re-export from specialized modules

// Core utilities defined inline
export {
  DEG2RAD,
  RAD2DEG,
  clamp,
  lerp,
  mergeDeep,
  toHexColor,
  randomRange,
  randomInt,
  smoothstep,
  mapRange,
  safeClone,
  debounce,
  throttle,
  isDefined,
  isPromise,
  sleep,
  retry,
  groupBy,
  unique,
  flatten,
  chunk,
  hexToRgb,
  rgbToHex,
  wrapError,
} from './core';

// Logger
export { logger, createLogger, setLogLevel, type LogLevel, type Logger } from './logger';

// Camera utilities
export { calculateFitView, CameraUtils, type FitViewResult, type Point } from './CameraUtils';

// DOM utilities
export { createElement, createElementNS, DOMUtils, type DOMElementOptions } from './DOMUtils';

// Color utilities
export { getRelativeLuminance, getContrastRatio, getCompliantColor } from './color';

// Error utilities
export { wrapError as wrapErrorDetailed } from './error';

// Math utilities
export { clamp01, lerp3, min3, max3, clamp180, angleDiff, randomThreeVector } from './math';

// Performance utilities
export {
  PerformanceMonitor,
  ObjectPool,
  memoize,
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
