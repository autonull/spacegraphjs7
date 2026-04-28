// Core module exports
export { SpaceGraph } from '../SpaceGraph';
export { Graph } from './Graph';
export { Renderer } from './Renderer';
export { RenderContext } from './RenderContext';
export { CameraControls } from './CameraControls';
export { EventSystem } from './events/EventSystem';
export { EventEmitter } from './EventEmitter';
export { VisionManager } from './VisionManager';
export { ObjectPoolManager } from './ObjectPoolManager';
export { PluginManager } from './PluginManager';
export type { Plugin } from './PluginManager';
export { Surface } from './Surface';
export { TypeRegistry } from './TypeRegistry';
export type { NodeConstructor, EdgeConstructor } from './TypeRegistry';

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
} from './constants';

// Defaults
export {
    DEFAULT_NODE_TYPES,
    DEFAULT_EDGE_TYPES,
    DEFAULT_LAYOUT_PLUGINS,
    DEFAULT_SYSTEM_PLUGINS,
    createQuickGraphSpec,
} from './defaults';
