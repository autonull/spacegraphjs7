// utils/index.ts - Consolidated utility exports
// All utilities re-exported from single source for better tree-shaking

// Collection utilities
export { appendTo } from './collection';

// Camera utilities
export type { FitInsets, FitSurface, FitViewResult, InsetRegion } from './CameraUtils';
export {
    AUTO_FOCUS_DURATION,
    calculateFitView,
    fitOrthoFrustum,
    focusNodeCamera,
    focusRadiusOf,
    halfFovTangent,
    insetRegion,
    normalizeInsets,
    setOrthoFrustum,
    visibleHeightAtDistance,
    visibleWorldExtent,
} from './CameraUtils';
// Color
export {
    dataColor,
    getCompliantColor,
    getContrastRatio,
    getRelativeLuminance,
    parseColor,
    toCssColor,
} from './color';
export type { DOMElementOptions } from './DOMUtils';
// DOM utilities
export { createElement, createElementNS, DOMUtils, requireElement } from './DOMUtils';
export type { SpaceGraphErrorOptions } from './error';
// Frame-rate measurement
export { FpsMeter, type FpsSample } from './FpsMeter';
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
export { clamp, clamp01, lerp, safeClone, seededRandom, seededRandom31 } from './math';
export {
    gridPoint,
    gridPoints,
    polarPoint,
    ringPoint,
    ringPoints,
    type Point3,
    type PointPlane,
    type RingOptions,
} from './points';
export { ribbonWidth, RIBBON_WIDTH_DEFAULTS, type RibbonCurve } from './ribbon';
// Performance utilities
export { batch, measure } from './performance';
// Projection helpers
export { clientToNdc, projectToNdc, worldToClient, worldToScreen } from './projection';
// Vector helpers
export { directionBetween, latLngToVec3, midpoint, perpendicularTo } from './vector';

// Three.js disposal
export { ThreeDisposer } from './ThreeDisposer';
