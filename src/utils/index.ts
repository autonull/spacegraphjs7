export {
  DEG2RAD,
  RAD2DEG,
  PI,
  TAU,
  EPSILON,
  clamp,
  clamp01,
  lerp,
  lerpClamped,
  inverseLerp,
  randomRange,
  randomInt,
  randomBool,
  randomPick,
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
  safeClone,
  deepEqual,
  debounce,
  throttle,
  isObject,
  isFunction,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isPlainObject,
  mergeDeep,
} from './math';

export { logger, createLogger, setLogLevel, type LogLevel, type Logger } from './logger';

export { SpaceGraphError, wrapError, wrapAndThrow, type SpaceGraphErrorOptions } from './error';
export { createElement, createElementNS, type DOMElementOptions, DOMUtils } from './DOMUtils';
export { calculateFitView, type FitViewResult, type Point, CameraUtils } from './CameraUtils';
export {
    calculateDistance,
    calculateMidpoint,
    calculatePinchZoom,
    calculatePan,
    calculateAngle,
    isClick,
    normalizeWheel,
    type DragCallback,
    type PinchCallback,
    type RotateCallback,
    GestureManager,
} from './GestureManager';
export { disposeObject3D, ThreeDisposer } from './ThreeDisposer';
export {
    getRelativeLuminance,
    getContrastRatio,
    getCompliantColor,
    hexToRgb,
    toHexColor,
    sortByFrequency,
} from './color';
