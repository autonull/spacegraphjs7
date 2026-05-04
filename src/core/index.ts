// Core module exports
// Note: SpaceGraph is exported from the main index.ts, not here
// Import directly: import { SpaceGraph } from '../SpaceGraph';
export { Graph } from './Graph';
export { Renderer } from './Renderer';
export { RenderContext } from './RenderContext';
export { CameraControls } from './CameraControls';
export { EventSystem, EventEmitter } from './events/EventSystem';
export { VisionManager } from './VisionManager';
export { ObjectPoolManager } from './ObjectPoolManager';
export { PluginManager } from './PluginManager';
export { ErgonomicsAPI } from './Ergonomics';
export type { Plugin } from './PluginManager';
export { Surface } from './Surface';
export { TypeRegistry } from './TypeRegistry';
export type { NodeConstructor, EdgeConstructor } from './TypeRegistry';

// Constants - comprehensive set for developer ergonomics
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
    Spatial,
    NodeDefaults,
    LayoutDefaults,
    Easing,
    CONSTANTS,
    // Shorthand aliases
    DUR,
    ZOOM,
    FINGER,
    THRESH,
    PERF,
    DEF,
    COLORS,
    // Math constants
    DEG2RAD,
    RAD2DEG,
    PI,
    TAU,
    EPSILON,
    RAD,
    DEG,
} from './constants';

// Defaults
export {
    DEFAULT_NODE_TYPES,
    DEFAULT_EDGE_TYPES,
    DEFAULT_LAYOUT_PLUGINS,
    DEFAULT_SYSTEM_PLUGINS,
    createQuickGraphSpec,
} from './defaults';

// Type exports
export type {
    AnimationDuration as AnimationDurationType,
    ZoomConfig as ZoomConfigType,
    FingeringPriority as FingeringPriorityType,
    InteractionThresholds as InteractionThresholdsType,
    Performance as PerformanceType,
    Defaults as DefaultsType,
    EdgeColors as EdgeColorsType,
    WCAG as WCAGType,
} from './constants';
