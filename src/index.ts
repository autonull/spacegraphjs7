// SpaceGraphJS v7 - Ergonomic Developer API
import './init';
import { SpaceGraph as SG } from './SpaceGraph';

// Core classes
export { SpaceGraph } from './SpaceGraph';
export { Graph } from './core/Graph';
export { Renderer } from './core/Renderer';
export { CameraControls } from './core/CameraControls';
export { EventSystem } from './core/events/EventSystem';
export { EventEmitter } from './core/EventEmitter';
export { VisionManager } from './core/VisionManager';
export { ObjectPoolManager } from './core/ObjectPoolManager';
export { PluginManager, type Plugin } from './core/PluginManager';
export { Surface } from './core/Surface';
export { TypeRegistry, type NodeConstructor, type EdgeConstructor } from './core/TypeRegistry';

// Builder API - fluent graph construction
export {
  NodeBuilder,
  EdgeBuilder,
  GraphSpecBuilder,
  graph,
  quickGraph,
  Patterns,
  Animate,
  Layout,
  Camera,
} from './builder';

// Constants - one-stop import
export {
  AnimationDuration,
  ZoomConfig,
  FingeringPriority,
  InteractionThresholds,
  Performance,
  Defaults,
  EdgeColors,
  InputConfig,
  WCAG,
  CONSTANTS,
} from './core/constants';

// Defaults
export {
  DEFAULT_NODE_TYPES,
  DEFAULT_EDGE_TYPES,
  DEFAULT_LAYOUT_PLUGINS,
  DEFAULT_SYSTEM_PLUGINS,
  createQuickGraphSpec,
} from './core/defaults';

// Utility functions - consolidated
export {
  // Math constants
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

  // Math utilities
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

  // 3D math
  lerp3,
  min3,
  max3,
  clamp180,
  angleDiff,

  // Random
  randomRange,
  randomInt,
  randomBool,
  randomPick,

  // Color
  toHexColor,
  hexToRgb,
  rgbToHex,
  getRelativeLuminance,
  getContrastRatio,
  getCompliantColor,

  // Object
  mergeDeep,
  safeClone,
  deepEqual,

  // Function
  debounce,
  throttle,

  // Memoization
  memoize,
  memoizeWithKey,

  // Array
  groupBy,
  unique,
  flatten,
  chunk,

  // Promise
  isPromise,
  sleep,
  retry,

  // Error
  wrapError,
} from './utils';

export { logger, createLogger, setLogLevel, type LogLevel, type Logger } from './utils/logger';
export { calculateFitView, type FitViewResult, type Point } from './utils/CameraUtils';
export { createElement, DOMUtils, type DOMElementOptions } from './utils/DOMUtils';
export { disposeThreeObject } from './utils/ThreeDisposer';

// Input system
export {
  InputManager,
  FingerManager,
  Fingering,
  createParentTransform,
  createCameraFingering,
  type CameraAction,
} from './input';

// Plugins
export * from './plugins';

// Nodes
export * from './nodes';

// Widget System
export { WidgetNode, type WidgetNodeData } from './nodes/WidgetNode';

// Edges
export * from './edges';

// Rendering
export { InstancedNodeRenderer, GEOMETRY_FAMILIES, type GeometryFamily as GeometryFamilyType } from './rendering/InstancedNodeRenderer';

// Vision system
export { VisionSystem, HeuristicsStrategy, type VisionCategory } from './vision';

// Spatial indexing
export { SpatialIndex, BVH } from './core/spatial/SpatialIndex';

// Object pooling
export { ObjectPool, MathPool, withPooledVector3, withPooledVector2, withPooledMatrix4, withPooledBox3 } from './core/pooling/ObjectPool';

// Graph utilities
export { randomTree, randomMesh, scaleFreeGraph, smallWorld, lattice2D } from './utils/graphGenerators';

// Types - comprehensive
export type {
  SpaceGraphOptions,
  RenderOptions,
  SpaceGraphEvents,
  Disposable,
  LayoutConfig,
  LayoutOptions,
  VisionOptions,
  VisionReport,
  VisionScore,
  GraphSpec,
  NodeSpec,
  EdgeSpec,
  SpecUpdate,
  GraphExport,
  GraphImportData,
  GraphEvent,
  NodeEvent,
  EdgeEvent,
  LabelLodLevel,
  HitResult,
  Rect,
  GridModel,
  ErgonomicsConfig,
  HUDElementOptions,
  HistoryPluginOptions,
  HoverMetaWidgetOptions,
  HoverAction,
  MermaidThemeName,
  MermaidLayoutType,
  MermaidNodeShape,
  GeometryFamily,
  LayoutName,
  SpaceGraphAppOptions,
  LogLevel,
  Logger,
} from './types';

// Version
export const VERSION = '7.0.0';

// Default export
export default SG;
