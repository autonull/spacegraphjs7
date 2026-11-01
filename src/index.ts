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
// Core module exports (all from core/index.ts)
export {
  // Camera
  CameraControls,
  // Constants
  AnimationDuration,
  BVH,
  createQuickGraphSpec,
  DEFAULT_CHROME_PLUGINS,
  DEFAULT_EDGE_TYPES,
  DEFAULT_LAYOUT_PLUGINS,
  DEFAULT_NODE_TYPES,
  DEFAULT_SYSTEM_PLUGINS,
  DEG2RAD,
  Defaults,
  Easing,
  EdgeColors,
  EPSILON,
  ErgonomicsAPI,
  EventEmitter,
  FingeringPriority,
  Graph,
  InputConfig,
  InteractionThresholds,
  LayoutDefaults,
  MathPool,
  NodeDefaults,
  ObjectPool,
  ObjectPoolManager,
  Performance,
  PI,
  PluginManager,
  RAD2DEG,
  RenderContext,
  Spatial,
  SpatialIndex,
  Surface,
  TAU,
  TypeRegistry,
  VisionManager,
  WebGLRenderer,
  WCAG,
  withPooledBox3,
  withPooledMatrix4,
  withPooledVector2,
  withPooledVector3,
  ZoomConfig,
  SpaceGraphApp,
} from './core';
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
  type NodePalette,
  NODE_PALETTE,
  type NodeTheme,
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
  type LayoutName,
  MermaidPlugin,
  type MermaidLayoutType,
  type MermaidNodeShape,
  type MermaidThemeName,
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
  IdCallback,
  LabelLodLevel,
  MaybePromise,
  NodeCallback,
  NodeConstructor,
  NodeSpec,
  Plugin,
  Point2D,
  Point3D,
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

// Logger utility
export { createLogger, logger, setLogLevel, type LogLevel, type Logger } from './utils/logger';
// Depth-cue primitives (LE.15)
export { DEPTH_MODES, depthFade, depthTreatment } from './depth/DepthCues';
export type { DepthTreatment } from './depth/DepthCues';
// Vision module exports (opt-in: import from the `spacegraphjs/vision` subpath; not re-exported here)
export type {
  VisionBenchmark,
  VisionIssue,
  VisionStrategy,
} from './vision/types';

// Convenience factory functions
import { SpaceGraph } from './SpaceGraph';
import { graph } from './builder';
import type { SpaceGraphOptions, GraphSpec } from './types';

export const createSpaceGraph = (
  container: HTMLElement,
  options?: SpaceGraphOptions
) => new SpaceGraph(container, options);
export const createGraph = () => graph();

// SimpleGraph: minimal entry point for static graph dashboards
// No chrome, no ergonomics, no physics, no vision — just force layout + HTML nodes + edges + camera + events
export interface SimpleGraphOptions extends Omit<SpaceGraphOptions, 'chrome' | 'plugins'> {
  /** Force layout options */
  layout?: {
    spacing?: number;
    iterations?: number;
    seed?: number;
  };
}

/**
 * Create a minimal graph for dashboards: force layout, HTML nodes, edges, camera, events.
 * @example
 * ```ts
 * const sg = await SimpleGraph.create('#container', { nodes, edges });
 * sg.on('node:click', ({ node }) => console.log(node.id));
 * ```
 */
export const SimpleGraph = {
  async create(
    container: HTMLElement | string,
    spec: GraphSpec,
    options: SimpleGraphOptions = {}
  ): Promise<SpaceGraph> {
    const element = typeof container === 'string' ? document.querySelector(container) : container;
    if (!element) throw new Error(`Container not found: ${container}`);

    const { layout = {}, ...sgOptions } = options;
    const sg = new SpaceGraph(element as HTMLElement, {
      ...sgOptions,
      chrome: false,
      plugins: [],
      render: { ...(sgOptions.render ?? {}), depth: 'flat', renderMode: 'on-demand' },
    });
    await sg.init();
    sg.loadSpec(spec).render();

    // Apply force layout once
    if (spec.nodes && spec.nodes.length > 0) {
      await sg.layoutOnce('force-layout', {
        spacing: layout.spacing ?? 120,
        iterations: layout.iterations ?? 200,
        seed: layout.seed ?? 42,
        randomize: true,
      });
    }

    return sg;
  },
};

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

// Type augmentation for global access
declare global {
  interface Window {
    SpaceGraph?: typeof import('./SpaceGraph').SpaceGraph;
  }
}
