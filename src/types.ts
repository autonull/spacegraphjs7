import type { Raycaster, Vector3 } from 'three';
import type { Edge } from './edges/Edge';
// types.ts - Ergonomic TypeScript types
import type { Node } from './nodes/Node';
import type { SpaceGraph } from './SpaceGraph';

export type { Edge, Node, SpaceGraph };

// ============= Utility Types =============
export type Maybe<T> = T | null | undefined;
export type MaybePromise<T> = T | Promise<T>;
export type Constructor<T, Args extends unknown[] = unknown[]> = new (...args: Args) => T;
export type Predicate<T> = (value: T) => boolean;
export type Disposer = () => void;
export type Nullable<T> = T | null;
export type Optional<T> = Partial<T>;
export type Awaited<T> = T extends Promise<infer U> ? U : T;
export type ValueOf<T> = T[keyof T];
export type KeysOf<T> = keyof T;

// Common callback types
export type NodeCallback<T = Node> = (node: T) => void;
export type EdgeCallback<T = Edge> = (edge: T) => void;
export type IdCallback = (id: string) => void;
export type AsyncCallback<T = void> = () => Promise<T> | T;

// ============= Geometry Types =============
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Bounds3D {
  min: Vector3;
  max: Vector3;
  center: Vector3;
  size: Vector3;

  containsPoint(point: Vector3): boolean;

  intersectsRay(ray: Raycaster): boolean;
}

// ============= Unified Node Data Base =============
export interface BaseNodeData {
  pinned?: boolean;
  visible?: boolean;
  /** Per-node LOD override honoured by `Node.computeLOD` (and the normalised zoom band). */
  lod?: 'high' | 'medium' | 'low' | 'hidden';
  minZoom?: number;
  maxZoom?: number;

  [key: string]: unknown;
}

// Consolidated dimension properties shared by most node types
export interface NodeDimensions {
  width?: number;
  height?: number;
  depth?: number;
}

// Consolidated visual properties shared by most node types
export interface NodeVisual {
  color?: string | number;
  opacity?: number;
  transparent?: boolean;
  wireframe?: boolean;
}

// Consolidated interaction properties
export interface NodeInteraction {
  draggable?: boolean;
  selectable?: boolean;
  focusable?: boolean;
}

// All node data types share these core properties
export type CoreNodeData = BaseNodeData & NodeDimensions & NodeVisual & NodeInteraction;

export interface BaseEdgeData {
  [key: string]: unknown;
}

export interface LabelLodLevel {
  distance?: number;
  scale?: number;
  style?: string;
  min?: number;
  max?: number;
  label?: string;
}

// ============= Node Data Types (Consolidated) =============
export interface ShapeNodeData extends CoreNodeData {
  shape?: 'box' | 'sphere' | 'circle' | 'plane' | 'cone' | 'cylinder' | 'torus' | 'ring';
  size?: number;
  side?: 'front' | 'back' | 'double';
}

export interface HtmlNodeData extends CoreNodeData {
  html?: string;
  className?: string;
  pointerEvents?: 'none' | 'auto';
  labelLod?: LabelLodLevel[];
}

export interface ImageNodeData extends CoreNodeData {
  url?: string;
}

export interface GroupNodeData extends CoreNodeData {
  depth?: number;
  title?: string;
}

export interface NoteNodeData extends CoreNodeData {
  text?: string;
  textColor?: string | number;
  fontSize?: number;
}

export interface CanvasNodeData extends CoreNodeData {
  dpi?: number;
}

export interface TextMeshNodeData extends CoreNodeData {
  text?: string;
  fontUrl?: string;
  size?: number;
  height?: number;
  align?: 'left' | 'center' | 'right';
}

export interface DataNodeData extends CoreNodeData {
  theme?: 'light' | 'dark';
  data?: unknown;
  expanded?: boolean;
  maxHeight?: number;
}

export interface VideoNodeData extends CoreNodeData {
  url?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export interface IFrameNodeData extends CoreNodeData {
  src?: string;
  scrolling?: 'yes' | 'no' | 'auto';
}

export interface ChartNodeData extends CoreNodeData {
  theme?: 'light' | 'dark';
  chartType?: 'bar' | 'line' | 'pie' | 'scatter' | 'radar';
  chartData?: unknown;
  chartOptions?: unknown;
}

export interface MarkdownNodeData extends CoreNodeData {
  theme?: 'light' | 'dark';
  content?: string;
  fontSize?: number;
}

export interface GlobeNodeData extends CoreNodeData {
  radius?: number;
  resolution?: number;
  textureUrl?: string;
  markers?: {
    lat: number;
    lng: number;
    size?: number;
    color?: number | string;
    label?: string;
  }[];
}

export interface SceneNodeData extends CoreNodeData {
  url?: string;
  targetSize?: number;
  autoCenter?: boolean;
}

export interface AudioNodeData extends CoreNodeData {
  src?: string;
  autoplay?: boolean;
  loop?: boolean;
}

export interface MathNodeData extends CoreNodeData {
  math?: string;
  fontSize?: number;
}

export interface ProcessNodeData extends CoreNodeData {
  pid?: string | number;
  name?: string;
  cpu?: number;
  memory?: number;
}

export interface CodeEditorNodeData extends CoreNodeData {
  code?: string;
  language?: string;
  theme?: string;
}

export interface InstancedShapeNodeData extends CoreNodeData {
  shape?: 'box' | 'sphere' | 'circle' | 'plane';
  size?: number;
}

export interface DOMNodeData extends CoreNodeData {
  /** Adopt a caller-supplied element instead of creating one. Never replaced on update. */
  element?: HTMLElement;
}

// Unified Widget Data
export interface WidgetNodeData extends CoreNodeData {
  disabled?: boolean;
  tabIndex?: number;
  ariaLabel?: string;
}

export type NodeData =
  | ShapeNodeData
  | HtmlNodeData
  | ImageNodeData
  | GroupNodeData
  | NoteNodeData
  | CanvasNodeData
  | TextMeshNodeData
  | DataNodeData
  | VideoNodeData
  | IFrameNodeData
  | ChartNodeData
  | MarkdownNodeData
  | GlobeNodeData
  | SceneNodeData
  | AudioNodeData
  | MathNodeData
  | ProcessNodeData
  | CodeEditorNodeData
  | InstancedShapeNodeData
  | DOMNodeData
  | WidgetNodeData;

// Unified SpaceGraph Node Data
export type SpaceGraphNodeData = NodeData & HtmlNodeData;

// ============= Edge Data Types =============
export interface EdgeData extends BaseEdgeData {
  color?: number;
  gradientColors?: [string, string];
  thickness?: number;
  thicknessInstanced?: number;
  arrowhead?: boolean | 'source' | 'target' | 'both';
  arrowheadSize?: number;
  arrowheadColor?: number;
  dashed?: boolean;
  dashScale?: number;
  dashSize?: number;
  gapSize?: number;
  label?: string;
  labelColor?: string;
  fontSize?: number;
  /** Optional pick radius (px) for easier edge clicking. Defaults to the raycaster line threshold. */
  hitWidth?: number;
  labelLod?: LabelLodLevel[];
}

// ============= Specification Types =============
export interface NodeSpec<T extends NodeData = NodeData> {
  id: string;
  type: string;
  label?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  data?: T;
  parameters?: Record<string, unknown>;
}

export interface EdgeSpec<T extends EdgeData = EdgeData> {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: T;
}

export interface GraphSpec {
  nodes?: NodeSpec[];
  edges?: EdgeSpec[];
  camera?: { position: [number, number, number]; target: [number, number, number] };
}

export interface SpecUpdate {
  nodes?: Partial<NodeSpec>[];
  edges?: Partial<EdgeSpec>[];
}

// ============= Event Types =============
export type GraphEvent =
  | 'node:added'
  | 'node:removed'
  | 'node:updated'
  | 'edge:added'
  | 'edge:removed'
  | 'edge:updated';
export type NodeEvent = 'node:updated' | 'node:destroying';
export type EdgeEvent = 'edge:updated' | 'edge:destroying';

export interface SpaceGraphEvents {
  'node:added': any;
  'node:removed': any;
  'node:updated': any;
  'edge:added': any;
  'edge:removed': any;
  'edge:updated': any;
  'graph:cleared': any;
  'selection:changed': any;
  'node:selection-changed': any;
  'node:click': any;
  'edge:click': any;
  'background:click': any;
  'node:dblclick': any;
  'camera:change': CameraViewport;
  'zoom:change': { zoom: number; previous: number };
  'zoomband:change': { band: string; normalized: number; zoom: number; label?: string; timestamp: number };
  'projection:change': { projection: Projection };
}

// Orthographic is the legibility baseline for 2D hosts; perspective stays the 3D experiment.
export type Projection = 'perspective' | 'orthographic';

// Camera keyboard input scope: off, the graph container, or the whole window.
export type KeyboardScope = false | 'container' | 'window';

// Continuous drives every animation frame; on-demand paints on mutations, camera moves, and resize.
export type RenderMode = 'continuous' | 'on-demand';

// Normalized (0..1) camera report: 1 is closest. `band` is host policy, never set by the core.
export interface CameraViewport {
  zoom: number;
  center: [number, number, number];
  distance: number;
  /** Visible world extent in the camera's XY plane, for host minimaps. */
  extent?: { width: number; height: number };
  band?: string;
}

// ============= Options Types =============
export interface SpaceGraphOptions {
  onnxExecutionProviders?: string[];
  vision?: {
    wasmPaths?: string;
    heuristics?: {
      wcagThreshold?: number;
      overlapPadding?: number;
      fittsLawTargetSize?: number;
    };
  };
  initialLayout?: string;
  cameraControls?: Partial<import('./core/CameraControls').CameraControlsConfig>;
  input?: DefaultInputConfig;
  /** Register the instance on `window.SpaceGraph` and `SpaceGraph.instances` for developer tooling
   * (vision/inspection). Off by default, and never consulted by graph semantics: instances are fully
   * isolated, so edges only resolve nodes in the same graph. */
  global?: boolean;
  /** Where camera keyboard input listens. `container` (default) scopes it to the graph element. */
  keyboard?: KeyboardScope;
  /** Render host chrome (HUD, minimap, zoom UI). Off by default so embedded graphs stay bare. */
  chrome?: boolean;
  /** Fly the camera to a node on double click. Defaults to true; embedded graphs often set false. */
  doubleClickFocus?: boolean;
  /** WebGL render options: background, transparency, antialias, pixel ratio, drawing-buffer retention. */
  render?: RenderOptions;
  /** Shared theme. `theme.background` takes precedence over `render.backgroundColor`. */
  theme?: SpaceGraphTheme;
  /** Extra plugin instances to register at init, after the defaults. */
  plugins?: Plugin[];

  [key: string]: unknown;
}

export interface SpaceGraphTheme {
  background?: string | number;
  /** Defaults applied to nodes that do not set their own colour. */
  node?: {
    fill?: string | number;
    stroke?: string | number;
  };
  /** Defaults applied to edges that do not set their own colour. */
  edge?: {
    color?: string | number;
    labelColor?: string;
  };
  /** Label typography shared by node and edge labels. */
  label?: {
    color?: string;
    fontFamily?: string;
    fontSize?: number;
  };
  /** Outline colours for interaction states (mesh outlines and edge highlight). */
  selection?: string | number;
  hover?: string | number;
  focus?: string | number;
}

// Input configuration
export interface DefaultInputConfig {
  camera?: CameraInputConfig;
  interaction?: InteractionInputConfig;
  history?: HistoryInputConfig;
}

export interface CameraInputConfig {
  enableCameraOrbit?: boolean;
  enableCameraPan?: boolean;
  enableCameraZoom?: boolean;
  rotationSpeed?: number;
  panSpeed?: number;
  zoomSpeed?: number;
  damping?: number;
  minRadius?: number;
  maxRadius?: number;
}

export interface InteractionInputConfig {
  enableHover?: boolean;
  enableBoxSelect?: boolean;
  enableDrag?: boolean;
  enableWidgets?: boolean;
  clickThreshold?: number;
}

export interface HistoryInputConfig {
  enabled?: boolean;
}

export interface RenderOptions {
  antialias?: boolean;
  alpha?: boolean;
  backgroundColor?: string | number;
  pixelRatio?: number;
  /** Render onto a transparent surface so the host's own background shows through. */
  transparent?: boolean;
  /** Keep the drawing buffer readable for screenshots. Defaults to true. */
  preserveDrawingBuffer?: boolean;
  /** Starting projection. Defaults to perspective; hosts that want 2D set orthographic. */
  projection?: Projection;
  /** Render scheduling. `on-demand` (default) paints on mutation/camera/resize; `continuous` runs every frame. */
  renderMode?: RenderMode;
}

export interface AnimationProps {
  x?: number;
  y?: number;
  z?: number;
  scale?: number;
  duration?: number;
  ease?: string;
  delay?: number;
  onUpdate?: () => void;
}

// ============= Export/Import Types =============
export interface GraphExport {
  nodes: Array<{
    id: string;
    type: string;
    label?: string;
    position: [number, number, number];
    data: unknown;
  }>;
  edges: Array<{ id: string; source: string; target: string; type: string; data: unknown }>;
  camera?: { position: [number, number, number]; target: [number, number, number] };
  plugins?: Record<string, unknown>;
}

export type GraphImportData = GraphExport;

// ============= Plugin System Types =============
export interface PluginLifecycle {
  init?(sg: any, graph: any, events: any): void | Promise<void>;

  onPreRender?(delta: number): void;

  onPostRender?(delta: number): void;

  onNodeAdded?(node: any): void;

  onNodeRemoved?(node: any): void;

  onEdgeAdded?(edge: any): void;

  onEdgeRemoved?(edge: any): void;

  dispose?(): void;

  export?(): unknown;

  import?(data: unknown): void;
}

export interface Plugin extends PluginLifecycle {
  readonly id: string;
  readonly name: string;
  readonly version: string;
}

// ============= Constructor Types =============
export type NodeConstructor = new (sg: SpaceGraph, spec: NodeSpec) => Node;
export type EdgeConstructor = new (
  sg: SpaceGraph,
  spec: EdgeSpec,
  source: Node,
  target: Node
) => Edge;

// ============= Vision Types =============
export type VisionCategory = 'wcag' | 'overlap' | 'fitts' | 'all';

export interface VisionOptions {
  enabled?: boolean;
  categories?: VisionCategory[];
  threshold?: number;
}

export interface VisionReport {
  score: number;
  issues: Array<{ type: string; severity: number; message: string }>;
}

export interface VisionScore {
  wcag: number;
  overlap: number;
  fitts: number;
  overall: number;
}

// ============= Alias Types =============
export type NodeType = string;
export type EdgeType = string;
export type GeometryFamily = string;

export interface HitResult {
  type: 'node' | 'edge' | 'none';
  distance?: number;
  node?: Node;
  edge?: Edge;
  point?: Point3D;
}

export type LayoutName = string;
export type MermaidThemeName = 'default' | 'forest' | 'dark' | 'neutral';
export type MermaidLayoutType = 'graph' | 'flowchart' | 'sequence' | 'class' | 'state' | 'gantt';
export type MermaidNodeShape = 'default' | 'circle' | 'ellipse' | 'rect' | 'diamond';

// ============= Ergonomic Type Helpers =============
export type NodeSpecWithPosition<T extends NodeData = NodeData> = NodeSpec<T> & {
  position: [number, number, number];
};
export type EdgeSpecWithData<T extends EdgeData = EdgeData> = EdgeSpec<T> & { data: T };
export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };
export type DeepRequired<T> = { [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P] };

// ============= Layout Types =============
// Note: Layout-specific options are defined in plugins/layouts/BaseLayout.ts
// Use import { LayoutOptions } from './plugins/layouts/BaseLayout' for full options

// ============= Ergonomic Factory Types =============
export type NodeFactoryFn = (id: string, ...args: unknown[]) => NodeSpec;
export type EdgeFactoryFn = (source: string, target: string, ...args: unknown[]) => EdgeSpec;

// ============= Shortcut Type Aliases =============
export type ID = string;
export type Coordinate2D = [number, number];
export type Coordinate3D = [number, number, number];
export type Position = Coordinate3D;
export type Size = { width: number; height: number };
export type Bounds = { min: Coordinate3D; max: Coordinate3D };

// ============= Event Handler Type =============
export type EventHandler<T = unknown> = (event: T) => void;
export type EventUnsubscribe = () => void;

// ============= Utility Aliases =============
export type { Logger, LogLevel } from './utils/logger';
