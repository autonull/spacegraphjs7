// SpaceGraphJS v7 - Ergonomic Developer API
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

// Builder
export {
  NodeBuilder, EdgeBuilder, GraphSpecBuilder, graph, quickGraph, Patterns,
  Animate, Layout, Camera, NodeFactory, EdgeFactory, widget, button, toggle, slider
} from './builder';

// Utils
export * from './utils';

// Input
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

// Vision
export { VisionSystem, HeuristicsStrategy } from './vision';
export type { VisionCategory, VisionOptions, VisionReport, VisionScore } from './vision';

// Pooling helpers
export { withPooledVector3, withPooledVector2, withPooledMatrix4, withPooledBox3 } from './core/pooling/ObjectPool';

// Types - comprehensive type exports
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

// Default export
export { SpaceGraph as default } from './SpaceGraph';
