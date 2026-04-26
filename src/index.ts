import './init';
import { SpaceGraph } from './SpaceGraph';

// Core
export { SpaceGraph } from './SpaceGraph';
export { SpaceGraphApp } from './core/SpaceGraphApp';
export { Graph } from './core/Graph';
export { Renderer } from './core/Renderer';
export { CameraControls } from './core/CameraControls';
export { EventSystem } from './core/events/EventSystem';
export { EventEmitter } from './core/EventEmitter';
export { VisionManager } from './core/VisionManager';
export { ObjectPoolManager } from './core/ObjectPoolManager';
export { PluginManager } from './core/PluginManager';
export type { Plugin as PluginInterface } from './core/PluginManager';
export { Surface } from './core/Surface';
export { TypeRegistry } from './core/TypeRegistry';

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

// Utils
export {
  DEG2RAD,
  RAD2DEG,
  clamp,
  lerp,
  mergeDeep,
  toHexColor,
  randomRange,
  randomInt,
  smoothstep,
  mapRange,
  safeClone,
} from './utils';

export { logger, createLogger, setLogLevel } from './utils/logger';
export { calculateFitView, CameraUtils } from './utils/CameraUtils';
export type { FitViewResult, Point } from './utils/CameraUtils';
export { createElement, DOMUtils } from './utils/DOMUtils';
export type { DOMElementOptions } from './utils/DOMUtils';
export { getRelativeLuminance, getContrastRatio, getCompliantColor, hexToRgb } from './utils/color';

// Input
export { InputManager, FingerManager, Fingering, createParentTransform } from './input';
export type {
  CameraOrbitingFingering,
  CameraPanningFingering,
  CameraZoomingFingering,
} from './input/fingerings';

// Plugins
export {
  ForceLayout,
  GridLayout,
  CircularLayout,
  HierarchicalLayout,
  RadialLayout,
  TreeLayout,
  SpectralLayout,
  GeoLayout,
  TimelineLayout,
  ClusterLayout,
  InteractionPlugin,
  LODPlugin,
  AutoLayoutPlugin,
  AutoColorPlugin,
  PhysicsPlugin,
  MinimapPlugin,
  ErgonomicsPlugin,
  VisionOverlayPlugin,
  HUDPlugin,
  HistoryPlugin,
  FractalZoomPlugin,
  ZoomUIPlugin,
  LayoutContainer,
  HoverMetaWidget,
  MermaidPlugin,
  injectMermaidStyles,
  DiagramParserFactory,
  DiagramParseResult,
  MermaidParser,
  DOTParser,
  GraphMLParser,
  JSONDiagramParser,
  LAYOUT_NAMES,
  MERMAID_THEMES,
  getLayoutLabel,
} from './plugins';

export type {
  ForceLayoutConfig,
  DiagramFormat,
  DiagramNode,
  DiagramEdge,
  MermaidPluginOptions,
} from './plugins';

// Nodes
export {
  Node,
  InstancedNode,
  ShapeNode,
  ButtonNode,
  SliderNode,
  ToggleNode,
  HtmlNode,
  InstancedShapeNode,
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
  StackingNode,
  GridNode,
  SplitNode,
  BorderNode,
  SwitchNode,
  VirtualGridNode,
  PanelNode,
  PortNode,
  DOMNode,
} from './nodes';

// Edges
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

// Rendering
export { InstancedNodeRenderer, GEOMETRY_FAMILIES } from './rendering/InstancedNodeRenderer';
export type { GeometryFamily as GeometryFamilyType } from './rendering/InstancedNodeRenderer';

// Vision
export { VisionSystem, HeuristicsStrategy } from './vision';
export type { VisionCategory } from './vision';

// Spatial
export { SpatialIndex, BVH } from './core/spatial/SpatialIndex';

// Pooling
export { ObjectPool, MathPool } from './core/pooling/ObjectPool';
export {
  withPooledVector3,
  withPooledVector2,
  withPooledMatrix4,
  withPooledBox3,
} from './core/pooling/ObjectPool';

// Types
export type {
  SpaceGraphOptions,
  RenderOptions,
  SpaceGraphEvents,
  Disposable,
  Plugin,
  LayoutConfig,
  LayoutOptions,
  VisionOptions,
  VisionReport,
  VisionScore,
  GraphSpec,
  NodeSpec,
  EdgeSpec,
  SpecUpdate,
  GraphExport,
  GraphImportData,
  GraphEvent,
  NodeEvent,
  EdgeEvent,
  LabelLodLevel,
  HitResult,
  Rect,
  GridModel,
  NodeConstructor,
  EdgeConstructor,
  ErgonomicsConfig,
  HUDElementOptions,
  HistoryPluginOptions,
  HoverMetaWidgetOptions,
  HoverAction,
  MermaidThemeName,
  MermaidLayoutType,
  MermaidNodeShape,
  GeometryFamily,
  LayoutName,
  SpaceGraphAppOptions,
  LogLevel,
  Logger,
} from './types';

// Version
export const VERSION = '7.0.0';

// Default export
export default { SpaceGraph, VERSION };
