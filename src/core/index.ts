// Core module exports
export { SpaceGraph } from './SpaceGraph';
export { Graph } from './core/Graph';
export { Renderer } from './core/Renderer';
export { CameraControls } from './core/CameraControls';
export { EventSystem } from './core/events/EventSystem';
export { EventEmitter } from './core/EventEmitter';
export { VisionManager } from './core/VisionManager';
export { ObjectPoolManager } from './core/ObjectPoolManager';
export { PluginManager } from './core/PluginManager';
export type { Plugin } from './core/PluginManager';
export { Surface } from './core/Surface';
export { TypeRegistry } from './core/TypeRegistry';
export type { NodeConstructor, EdgeConstructor } from './core/TypeRegistry';

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
