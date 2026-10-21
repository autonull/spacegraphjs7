// utils/index.ts - Consolidated utility exports
// All utilities re-exported from single source for better tree-shaking

// Re-export constants from core (includes math constants)
export {
  AnimationDuration,
  COLORS,
  CONSTANTS,
  DEF,
  DEG,
  DEG2RAD,
  Defaults,
  DUR,
  Easing,
  EdgeColors,
  EPSILON,
  FINGER,
  FingeringPriority,
  InputConfig,
  InteractionThresholds,
  LayoutDefaults,
  NodeDefaults,
  PERF,
  Performance,
  PI,
  RAD,
  RAD2DEG,
  Spatial,
  TAU,
  THRESH,
  WCAG,
  ZOOM,
  ZoomConfig,
} from '../core/constants';
export type { FitInsets, FitSurface, FitViewResult } from './CameraUtils';
// Camera utilities
export {
  calculateFitView,
  fitOrthoFrustum,
  focusNodeCamera,
  focusRadiusOf,
  halfFovTangent,
  setOrthoFrustum,
  visibleHeightAtDistance,
  visibleWorldExtent,
} from './CameraUtils';
// Color
export type { ColorStop } from './color';
export {
  adjustHue,
  adjustLightness,
  adjustSaturation,
  blendColors,
  darken,
  dataColor,
  desaturate,
  generateGradient,
  generateGradientPalette,
  generatePalette,
  getCompliantColor,
  getContrastRatio,
  getRelativeLuminance,
  hexToHsl,
  hexToRgb,
  hslToHex,
  lerpColor,
  lerpColorHex,
  lighten,
  parseColor,
  rgbToHex,
  saturate,
  toCssColor,
  toCssGradient,
  toHexColor,
} from './color';
export type { DOMElementOptions } from './DOMUtils';
// DOM utilities
export { createElement, createElementNS, DOMUtils } from './DOMUtils';
export type { SpaceGraphErrorOptions } from './error';
// Error utilities - unified error handling
export {
  ConfigurationError,
  createErrorFactory,
  NotImplementedError,
  SpaceGraphError,
  ValidationError,
  wrapError,
} from './error';
export type {
  DragCallback,
  PinchCallback,
  Point as GesturePoint,
  RotateCallback,
} from './GestureManager';
// Gesture utilities
export {
  calculateAngle,
  calculateDistance,
  calculateMidpoint,
  calculatePan,
  calculatePinchZoom,
  isClick,
  normalizeWheel,
} from './GestureManager';
// Graph generators
export { lattice2D, randomMesh, randomTree, scaleFreeGraph, smallWorld } from './graphGenerators';
export type { Logger, LogLevel } from './logger';
// Logger
export { createLogger, logger, setLogLevel } from './logger';
export type { NodeSize } from './nodeResize';
// Node resize
export { MAX_NODE_SIZE, MIN_NODE_SIZE, nodeScreenSize, NodeResizer } from './nodeResize';
// Node parent
export { parentIdOf } from './nodeParent';
// Math utilities (from math.ts) - excluding constants which come from core
export {
  abs,
  angleDiff,
  approx,
  // Math functions
  clamp,
  clamp01,
  clamp180,
  deepEqual,
  inverseLerp,
  isArray,
  isBoolean,
  isDefined,
  isFunction,
  isNumber,
  // Type guards
  isObject,
  isPlainObject,
  isString,
  lerp,
  // Vector math
  lerp3,
  lerpClamped,
  mapRange,
  max,
  max3,
  mean,
  min,
  min3,
  randomBool,
  randomInt,
  randomPick,
  // Random
  randomRange,
  randomThreeVector,
  round,
  // Object utilities
  safeClone,
  sign,
  smootherstep,
  smoothstep,
  sum,
} from './math';
// Performance utilities
export {
  batch,
  batchAsync,
  cancelIdleCallbackPolyfill,
  debounceByTime,
  getMemoryUsage,
  measure,
  measureAsync,
  ObjectPool,
  PerformanceMonitor,
  requestIdleCallbackPolyfill,
  throttleByTime,
} from './performance';
// Projection helpers
export { clientToNdc, projectToNdc, worldToClient, worldToScreen } from './projection';
// Vector helpers
export { directionBetween, latLngToVec3, midpoint, perpendicularTo } from './vector';

// Three.js disposal
export { ThreeDisposer } from './ThreeDisposer';
