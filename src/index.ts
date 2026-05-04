// SpaceGraphJS v7 - Ergonomic Developer API
// Optimized for developer experience with unified exports and convenient shortcuts
export { SpaceGraph, VERSION } from './SpaceGraph';

// Core module exports
export {
  Graph, Renderer, CameraControls, PluginManager, Surface, TypeRegistry, ErgonomicsAPI,
  EventSystem, EventEmitter, VisionManager, ObjectPoolManager,
  AnimationDuration, ZoomConfig, FingeringPriority, InteractionThresholds, Performance,
  Defaults, EdgeColors, WCAG, InputConfig, CONSTANTS,
  Spatial, NodeDefaults, LayoutDefaults, Easing,
  DEG2RAD, RAD2DEG, PI, TAU, EPSILON, DUR, ZOOM, FINGER, THRESH, PERF, DEF, COLORS,
} from './core';

export {
  DEFAULT_NODE_TYPES, DEFAULT_EDGE_TYPES, DEFAULT_LAYOUT_PLUGINS, DEFAULT_SYSTEM_PLUGINS, createQuickGraphSpec,
  SpatialIndex, BVH, ObjectPool, MathPool,
} from './core';

// Core aliases for convenience
export { EventSystem as Event, EventEmitter as Emitter, ErgonomicsAPI as Ergo, ObjectPoolManager as Pools };

// Builder module exports
export {
  GraphSpecBuilder, NodeBuilder, EdgeBuilder, Patterns,
  Animate, Camera, graph,
  NodeFactory, EdgeFactory, Layout,
  NodeFactoryExtended, Presets, DataUtils, Batch,
  widget, button, toggle, slider,
  // Convenience shortcuts
  nodeSpec, edgeSpec, at, box, sphere, circle,
  connect, arrow, dashed, curved, $, layout,
} from './builder';

// Input module exports  
export { InputManager, Fingering, createParentTransform, createCameraFingering } from './input';

// Utils module exports
export * from './utils';

// Vision module exports
export { VisionSystem, HeuristicsStrategy } from './vision';
export {
  type VisionStrategy,
  type VisionReport,
  type VisionOptions,
  type VisionBenchmark,
  type VisionCategory,
  type VisionScore,
  type VisionIssue,
} from './vision/types';

// Rendering exports
export { InstancedNodeRenderer, GEOMETRY_FAMILIES } from './rendering/InstancedNodeRenderer';

// Nodes exports - consolidated core node types
export {
  Node,
  WidgetNode,
  ShapeNode,
  InstancedNode,
  InstancedShapeNode,
  ButtonNode,
  SliderNode,
  ToggleNode,
  HtmlNode,
  ImageNode,
  GroupNode,
  NoteNode,
  CanvasNode,
  TextMeshNode,
  DataNode,
  VideoNode,
  IFrameNode,
  ChartNode,
  MarkdownNode,
  GlobeNode,
  SceneNode,
  AudioNode,
  MathNode,
  ProcessNode,
  CodeEditorNode,
  DOMNode,
  LayoutNode,
  StackingNode,
  GridNode,
  SplitNode,
  BorderNode,
  SwitchNode,
  VirtualGridNode,
  PanelNode,
  PortNode,
} from './nodes';

// Edges exports - consolidated edge types
export {
  Edge,
  CurvedEdge,
  FlowEdge,
  LabeledEdge,
  DottedEdge,
  DynamicThicknessEdge,
  AnimatedEdge,
  BundledEdge,
  InterGraphEdge,
  Wire,
} from './edges';

// Layout exports
export { BaseLayout } from './plugins/layouts/BaseLayout';
export { ForceLayout, GridLayout, CircularLayout, HierarchicalLayout, RadialLayout, TreeLayout, SpectralLayout, GeoLayout, TimelineLayout, ClusterLayout } from './plugins/layouts';

// Plugin exports
export {
  InteractionPlugin,
  LODPlugin,
  AutoLayoutPlugin,
  AutoColorPlugin,
  PhysicsPlugin,
  MinimapPlugin,
  VisionOverlayPlugin,
  HUDPlugin,
  HistoryPlugin,
  FractalZoomPlugin,
  ZoomUIPlugin,
  LayoutContainer,
} from './plugins';

// HUD exports
export { DOMOverlayPlugin } from './plugins/DOMOverlayPlugin';
export {
  HUD_ZINDEX,
  HUD_COLORS,
  HUD_STYLES,
  getHUDPosition,
  type HUDPositionKey,
} from './plugins/hud/HUDStyles';
export { withPooledVector3, withPooledVector2, withPooledMatrix4, withPooledBox3 } from './core/pooling/ObjectPool';

// Type exports
export type {
  Plugin, NodeConstructor, EdgeConstructor,
  LogLevel, Logger,
  InputEvent, InputEventType, InputAction, InputBinding, InputContext, InputState,
  GeometryFamily as GeometryFamilyType,
  VisionCategory, VisionOptions, VisionReport, VisionScore,
  SpaceGraphOptions, RenderOptions, GraphSpec, NodeSpec, EdgeSpec,
  SpecUpdate, GraphExport, GraphImportData, HitResult,
  LabelLodLevel, Rect, GridModel, DeepPartial,
  Maybe, MaybePromise, Predicate, EventHandler, Disposer,
  Point2D, Point3D, Bounds3D,
  NodeCallback, EdgeCallback, IdCallback, AsyncCallback,
  ID, Coordinate2D, Coordinate3D, Position, Size, Bounds,
} from './types';

// Widget types
export type { WidgetNodeData } from './nodes/WidgetNode';

// Convenience factory functions
export const createSpaceGraph = (options?: import('./types').SpaceGraphOptions) => new SpaceGraph(options);
export const createGraph = import('./builder').then(m => m.graph);

// Shorthand factories for quick graph creation
export const sg = createSpaceGraph;
export const qg = createGraph;

// Quick node creation shortcuts
export const node = (id: string, type = 'ShapeNode', position?: [number, number, number]) => ({ id, type, position });
export const edge = (id: string, source: string, target: string) => ({ id, source, target });

// Default export
export { SpaceGraph as default } from './SpaceGraph';

// Type augmentation for global ease access
declare global {
  interface Window {
    ease: typeof import('./utils/math').ease;
    SpaceGraph: typeof import('./SpaceGraph').SpaceGraph;
  }
}
