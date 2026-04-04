// SpaceGraphJS - Core Module Exports

// Event Emitter Base
export { EventEmitter } from './EventEmitter';

// Event System
export { EventSystem, PluginEventBus } from './events/EventSystem';
export type {
    SpaceGraphEvents,
    PluginEvent,
    VisionReportEvent,
    LayoutAppliedEvent,
    OverlapDetectedEvent,
    NodeDragEvent,
    SelectionChangedEvent,
    AnyPluginEvent,
} from './events/EventSystem';

// Plugin System
export { PluginRegistry } from './plugins/PluginRegistry';
export { BaseLayout } from './plugins/BaseLayout';
export type { LayoutConfig, LayoutOptions } from './plugins/BaseLayout';
export type { Plugin, PluginContext } from './plugins/PluginRegistry';

// Type Registry
export { TypeRegistry } from './TypeRegistry';
export type { NodeConstructor, EdgeConstructor } from './TypeRegistry';

// Camera Controls
export { CameraControls } from './CameraControls';
export type { CameraControlsConfig } from './CameraControls';

// Object Pool
export { ObjectPool, MathPool } from './pooling/ObjectPool';
export {
    withPooledVector3,
    withPooledVector2,
    withPooledMatrix4,
    withPooledBox3,
} from './pooling/ObjectPool';

// Spatial Index
export { SpatialIndex, BVH } from './spatial/SpatialIndex';

// Rendering
export { RenderingSystem } from './renderer/RenderingSystem';
export type { RenderOptions } from './renderer/RenderingSystem';

// Re-export main SpaceGraph from parent
export { SpaceGraph } from '../SpaceGraph';
export type { SpaceGraphOptions } from '../types';
