// Core module exports
// Note: SpaceGraph is exported from the main index.ts, not here
// Import directly: import { SpaceGraph } from '../SpaceGraph';

export { CameraControls } from './CameraControls';
// Constants - comprehensive set for developer ergonomics
export {
  AnimationDuration,
  COLORS,
  CONSTANTS,
  DEF,
  DEG,
  // Math constants
  DEG2RAD,
  Defaults,
  // Shorthand aliases
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
} from './constants';
// Defaults
export {
  createQuickGraphSpec,
  DEFAULT_CHROME_PLUGINS,
  DEFAULT_EDGE_TYPES,
  DEFAULT_LAYOUT_PLUGINS,
  DEFAULT_NODE_TYPES,
  DEFAULT_SYSTEM_PLUGINS,
} from './defaults';
export { ErgonomicsAPI } from './Ergonomics';
export { EventEmitter, EventSystem } from './events/EventSystem';
export { forwardGraphEvents } from './forwardEvents';
export { Graph } from './Graph';
export { Selection } from './Selection';
export { ObjectPoolManager } from './ObjectPoolManager';
export type { Plugin } from './PluginManager';
export { PluginManager } from './PluginManager';
export { MathPool, ObjectPool } from './pooling/ObjectPool';
export { RenderContext } from './RenderContext';
export { WebGLRenderer, Renderer } from './WebGLRenderer';
export { Surface } from './Surface';
export { BVH, SpatialIndex } from './spatial/SpatialIndex';
export type { EdgeConstructor, NodeConstructor } from './TypeRegistry';
export { TypeRegistry } from './TypeRegistry';
export { VisionManager } from './VisionManager';

// Type exports - types are co-located with values in constants.ts
// (Duplicate identifiers removed as they are already exported as values)
