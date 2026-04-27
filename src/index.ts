// SpaceGraphJS v7.0.0 - Aggressively Refactored
import './init';
import { SpaceGraph as SG } from './SpaceGraph';

// Core
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

// App
export { SpaceGraphApp } from './core/SpaceGraphApp';
export type { SpaceGraphAppOptions, AppButtonConfig } from './core/SpaceGraphApp';

// Builder API
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

// Constants
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
} from './core/constants';

// Defaults
export {
  DEFAULT_NODE_TYPES,
  DEFAULT_EDGE_TYPES,
  DEFAULT_LAYOUT_PLUGINS,
  DEFAULT_SYSTEM_PLUGINS,
  createQuickGraphSpec,
} from './core/defaults';

// Utils
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
} from './utils';

export { logger, createLogger, setLogLevel } from './utils/logger';
export { calculateFitValue, CameraUtils } from './utils/CameraUtils';
export type { FitValueResult, Point } from './utils/CameraUtils';
export { createElement, DOMUtils } from './utils/DOMUtils';
export type { DOMElementOptions } from './utils/DOMUtils';
export { getRelativeLuminance, getContrastRatio, getCompliantColor } from './utils/color';

// Input
export { InputManager, FingerManager, Fingering, createParentTransform } from './input';
export type { CameraOrbitingFingering, CameraPanningFingering, CameraZoomingFingering } from './input/fingerings';

// Plugins - Re-export from plugins/index.ts
export * from './plugins';

// Nodes - Re-export from nodes/index.ts
export * from './nodes';

// Edges - Re-export from edges/index.ts
export * from './edges';

// Rendering
export { InstancedNodeRenderer, GEOMETRY_FAMILIES } from './rendering/InstancedNodeRenderer';
export type { GeometryFamily as GeometryFamilyType } from './rendering/InstancedNodeRenderer';

// Vision
export { VisionSystem, HeuristicsStrategy } from './vision';
export type { VisionCategory } from './vision';

// Spatial
export { SpatialIndex, BVH } from './core/spatial/SpatialIndex';

// Pooling
export { ObjectPool, MathPool } from './core/pooling/ObjectPool';
export { withPooledVector3, withPooledVector2, withPooledMatrix4, withPooledBox3 } from './core/pooling/ObjectPool';

// Types
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
