// Core module exports
// Note: SpaceGraph is exported from the main index.ts, not here
// Import directly: import { SpaceGraph } from '../SpaceGraph';

export { CameraControls } from './CameraControls';
// Constants - comprehensive set for developer ergonomics
export {
    EPSILON,
    PI,
    RAD2DEG,
    TAU,
    Easing,
    EdgeColors,
    FingeringPriority,
    InteractionThresholds,
    LayoutDefaults,
    NodeDefaults,
    Performance,
    Spatial,
    Defaults,
    WCAG,
} from './constants';
// Defaults
export {
    createQuickGraphSpec,
    DEFAULT_CHROME_PLUGINS,
    DEFAULT_EDGE_TYPES,
    DEFAULT_LAYOUT_PLUGINS,
    LAYOUT_REGISTRY,
    DEFAULT_NODE_TYPES,
    DEFAULT_SYSTEM_PLUGINS,
} from './defaults';
export { ErgonomicsAPI } from './Ergonomics';
export { EventEmitter, type Disposable } from './EventEmitter';
export { forwardGraphEvents } from './forwardEvents';
export { Graph, type EdgeDirection } from './Graph';
export { Selection } from './Selection';
export { ObjectPoolManager } from './ObjectPoolManager';
export type { Plugin, PluginKey } from './PluginManager';
export { PluginManager } from './PluginManager';
export { MathPool, ObjectPool } from './pooling/ObjectPool';
export {
    withPooledBox3,
    withPooledMatrix4,
    withPooledVector2,
    withPooledVector3,
    withPooledVectors,
} from './pooling/ObjectPool';
export { RenderContext } from './RenderContext';
export { WebGLRenderer } from './WebGLRenderer';
export { Surface } from './Surface';
export { SpatialIndex } from './spatial/SpatialIndex';
export type { EdgeConstructor, NodeConstructor } from './TypeRegistry';
export { TypeRegistry } from './TypeRegistry';
export { VisionManager } from './VisionManager';
export { SpaceGraphApp, type AppButtonConfig, type SpaceGraphAppOptions } from './SpaceGraphApp';
export { GraphQuery } from './GraphQuery';
export { GraphAlgorithms } from './GraphAlgorithms';
export { GraphSerialization } from './GraphSerialization';

// Type exports - types are co-located with values in constants.ts
// (Duplicate identifiers removed as they are already exported as values)
