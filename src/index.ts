// SpaceGraphJS v7 - Ergonomic Developer API
// Optimized for developer experience with unified exports and convenient shortcuts

// Builder module exports
export {
  $,
  Animate,
  arrow,
  at,
  Batch,
  box,
  button,
  Camera,
  circle,
  connect,
  curved,
  DataUtils,
  dashed,
  EdgeBuilder,
  EdgeFactory,
  edgeSpec,
  GraphSpecBuilder,
  graph,
  Layout,
  layout,
  NodeBuilder,
  NodeFactory,
  NodeFactoryExtended,
  // Convenience shortcuts
  nodeSpec,
  Patterns,
  Presets,
  slider,
  sphere,
  toggle,
  widget,
} from './builder';
// Core module exports
// Core aliases for convenience
export {
  AnimationDuration,
  BVH,
  CameraControls,
  COLORS,
  CONSTANTS,
  createQuickGraphSpec,
  DEF,
  DEFAULT_CHROME_PLUGINS,
  DEFAULT_EDGE_TYPES,
  DEFAULT_LAYOUT_PLUGINS,
  DEFAULT_NODE_TYPES,
  DEFAULT_SYSTEM_PLUGINS,
  DEG2RAD,
  Defaults,
  DUR,
  Easing,
  EdgeColors,
  EPSILON,
  ErgonomicsAPI,
  ErgonomicsAPI as Ergo,
  EventEmitter,
  EventEmitter as Emitter,
  EventSystem,
  EventSystem as Event,
  FINGER,
  FingeringPriority,
  Graph,
  InputConfig,
  InteractionThresholds,
  LayoutDefaults,
  MathPool,
  NodeDefaults,
  ObjectPool,
  ObjectPoolManager,
  ObjectPoolManager as Pools,
  PERF,
  Performance,
  PI,
  PluginManager,
  RAD2DEG,
  Renderer,
  Spatial,
  SpatialIndex,
  Surface,
  TAU,
  THRESH,
  TypeRegistry,
  WCAG,
  ZOOM,
  ZoomConfig,
} from './core';
export {
  withPooledBox3,
  withPooledMatrix4,
  withPooledVector2,
  withPooledVector3,
} from './core/pooling/ObjectPool';
export { SpaceGraphApp } from './core/SpaceGraphApp';
// Edges exports - consolidated edge types
export {
  AnimatedEdge,
  BundledEdge,
  CurvedEdge,
  DottedEdge,
  DynamicThicknessEdge,
  Edge,
  FlowEdge,
  InterGraphEdge,
  LabeledEdge,
  Wire,
} from './edges';
// Input module exports
export { createCameraFingering, createParentTransform, Fingering, InputManager } from './input';
// Nodes exports - consolidated core node types
export {
  AudioNode,
  BorderNode,
  ButtonNode,
  CanvasNode,
  ChartNode,
  CodeEditorNode,
  DataNode,
  DOMNode,
  GlobeNode,
  GridNode,
  GroupNode,
  HtmlNode,
  IFrameNode,
  ImageNode,
  InstancedNode,
  InstancedShapeNode,
  LayoutNode,
  MarkdownNode,
  MathNode,
  Node,
  NoteNode,
  PanelNode,
  PortNode,
  ProcessNode,
  SceneNode,
  ShapeNode,
  SliderNode,
  SplitNode,
  StackingNode,
  SwitchNode,
  TextMeshNode,
  ToggleNode,
  VideoNode,
  VirtualGridNode,
  WidgetNode,
} from './nodes';
// Widget types
export type { WidgetNodeData } from './nodes/WidgetNode';
// Plugin exports
export {
  AutoColorPlugin,
  AutoLayoutPlugin,
  DiagramParserFactory,
  FractalZoomPlugin,
  HistoryPlugin,
  HoverMetaWidget,
  HUDPlugin,
  InteractionPlugin,
  injectMermaidStyles,
  LayoutContainer,
  LODPlugin,
  MermaidPlugin,
  MinimapPlugin,
  PhysicsPlugin,
  VisionOverlayPlugin,
  ZoomBandsPlugin,
  ZoomUIPlugin,
} from './plugins';
// HUD exports
export { DOMOverlayPlugin } from './plugins/DOMOverlayPlugin';
export {
  getHUDPosition,
  HUD_COLORS,
  HUD_STYLES,
  HUD_ZINDEX,
  type HUDPositionKey,
} from './plugins/hud/HUDStyles';
export {
  CircularLayout,
  ClusterLayout,
  ForceLayout,
  GeoLayout,
  GridLayout,
  HierarchicalLayout,
  RadialLayout,
  SpectralLayout,
  TimelineLayout,
  TreeLayout,
} from './plugins/layouts';
// Layout exports
export { BaseLayout } from './plugins/layouts/BaseLayout';
// Rendering exports
export { GEOMETRY_FAMILIES, InstancedNodeRenderer } from './rendering/InstancedNodeRenderer';
export { SpaceGraph, VERSION } from './SpaceGraph';
// Type exports
export type {
  AsyncCallback,
  Bounds,
  Bounds3D,
  Coordinate2D,
  Coordinate3D,
  DeepPartial,
  Disposer,
  EdgeCallback,
  EdgeConstructor,
  EdgeSpec,
  EventHandler,
  GeometryFamily as GeometryFamilyType,
  GraphExport,
  GraphImportData,
  GraphSpec,
  HitResult,
  ID,
  IdCallback,
  LabelLodLevel,
  Logger,
  LogLevel,
  Maybe,
  MaybePromise,
  NodeCallback,
  NodeConstructor,
  NodeSpec,
  Plugin,
  Point2D,
  Point3D,
  Position,
  Predicate,
  Rect,
  RenderOptions,
  Size,
  SpaceGraphOptions,
  SpaceGraphTheme,
  SpecUpdate,
  VisionCategory,
  VisionOptions,
  VisionReport,
  VisionScore,
} from './types';
// Utils module exports
export * from './utils';
// Vision module exports (opt-in: import from the `spacegraphjs/vision` subpath; not re-exported here)
export type {
  VisionBenchmark,
  VisionIssue,
  VisionStrategy,
} from './vision/types';

// Convenience factory functions
import { SpaceGraph } from './SpaceGraph';

export const createSpaceGraph = (
  container: HTMLElement,
  options?: import('./types').SpaceGraphOptions
) => new SpaceGraph(container, options);
export const createGraph = import('./builder').then((m) => m.graph);

// Shorthand factories for quick graph creation
export const sg = createSpaceGraph;
export const qg = createGraph;

// Quick node creation shortcuts
export const node = (id: string, type = 'ShapeNode', position?: [number, number, number]) => ({
  id,
  type,
  position,
});
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
