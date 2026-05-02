// SpaceGraphJS v7 - Ergonomic Developer API
// Optimized for developer experience with unified exports and convenient shortcuts
import './init';
export { SpaceGraph, VERSION } from './SpaceGraph';

// Core - consolidated exports
export {
  Graph, Renderer, CameraControls, PluginManager, Surface, TypeRegistry, ErgonomicsAPI,
  EventSystem, EventEmitter, VisionManager, ObjectPoolManager,
  AnimationDuration, ZoomConfig, FingeringPriority, InteractionThresholds, Performance,
  Defaults, EdgeColors, WCAG, InputConfig, CONSTANTS,
  DEG2RAD, RAD2DEG, PI, TAU, EPSILON, DUR, ZOOM, FINGER, THRESH, PERF, DEF, COLORS,
  DEFAULT_NODE_TYPES, DEFAULT_EDGE_TYPES, DEFAULT_LAYOUT_PLUGINS, DEFAULT_SYSTEM_PLUGINS, createQuickGraphSpec,
  SpatialIndex, BVH, ObjectPool, MathPool,
} from './core';

export type {
  Plugin, NodeConstructor, EdgeConstructor,
  LogLevel, Logger,
} from './core';

// Builder - Ergonomic chainable API
export {
  NodeBuilder, EdgeBuilder, GraphSpecBuilder, graph, quickGraph, Patterns,
  Animate, Layout, Camera, NodeFactory, EdgeFactory, widget, button, toggle, slider,
  NodeFactoryExtended, Presets, DataUtils, Batch
} from './builder';

// Utils - Comprehensive utilities including easing, math, color, and more
export * from './utils';

// Easing - Top-level convenience export for animations
export { ease } from './utils/math';

// Input System
export { InputManager, FingerManager, Fingering, createParentTransform, createCameraFingering } from './input';
export type { CameraAction, InputEvent, InputEventType, InputAction, InputBinding, InputContext, InputState } from './input';

// Plugins
export * from './plugins';

// Nodes & Edges
export * from './nodes';
export * from './edges';

// Rendering
export { InstancedNodeRenderer, GEOMETRY_FAMILIES } from './rendering/InstancedNodeRenderer';
export type { GeometryFamily as GeometryFamilyType } from './rendering/InstancedNodeRenderer';

// Vision System
export { VisionSystem, HeuristicsStrategy } from './vision';
export type { VisionCategory, VisionOptions, VisionReport, VisionScore } from './vision';

// Pooling helpers
export { withPooledVector3, withPooledVector2, withPooledMatrix4, withPooledBox3 } from './core/pooling/ObjectPool';

// Types - Comprehensive type exports
export type {
  SpaceGraphOptions, RenderOptions, SpaceGraphEvents, Disposable,
  LayoutConfig, LayoutOptions, VisionOptions, VisionReport, VisionScore,
  GraphSpec, NodeSpec, EdgeSpec, SpecUpdate, GraphExport, GraphImportData,
  GraphEvent, NodeEvent, EdgeEvent, LabelLodLevel, HitResult,
  Rect, GridModel, ErgonomicsConfig, HUDElementOptions, HistoryPluginOptions, HoverMetaWidgetOptions,
  HoverAction, MermaidThemeName, MermaidLayoutType, MermaidNodeShape, GeometryFamily, LayoutName,
  SpaceGraphAppOptions,
  NodeData, EdgeData, NodeSpecWithPosition, EdgeSpecWithData, DeepPartial,
  Maybe, MaybePromise, Predicate, EventHandler, Disposer,
  Point2D, Point3D, Bounds3D,
  NodeCallback, EdgeCallback, IdCallback, AsyncCallback,
  ID, Coordinate2D, Coordinate3D, Position, Size, Bounds,
} from './types';

// Widget
export { WidgetNode } from './nodes/WidgetNode';
export type { WidgetNodeData } from './nodes/WidgetNode';

// Convenience: Create a SpaceGraph instance with sensible defaults
export const createSpaceGraph = (options?: import('./types').SpaceGraphOptions) => new SpaceGraph(options);

// Convenience: Quick graph spec generator
export const createGraph = import('./builder').then(m => m.graph);

// Default export
export { SpaceGraph as default } from './SpaceGraph';

// Type augmentation for global ease access
declare global {
  interface Window {
    ease: typeof import('./utils/math').ease;
    SpaceGraph: typeof import('./SpaceGraph').SpaceGraph;
  }
}
