// Core type utilities
export type Primitive = string | number | boolean | null | undefined;
export type MaybePromise<T> = T | Promise<T>;
export type Constructor<T, Args extends unknown[] = unknown[]> = new (...args: Args) => T;
export type AbstractConstructor<T, Args extends unknown[] = unknown[]> = abstract new (...args: Args) => T;
export type Predicate<T> = (value: T) => boolean;
export type Consumer<T> = (value: T) => void;
export type Mapper<T, R> = (value: T) => R;
export type Comparator<T> = (a: T, b: T) => number;

// Utility interfaces
export interface Dimensions { width?: number; height?: number; }
export interface Colorable { color?: string | number; }
export interface Opacity { opacity?: number; }
export interface Themable { theme?: 'light' | 'dark'; }

// Composition helpers
export type WithDimensions<T> = T & Dimensions;
export type WithColorable<T> = T & Colorable;
export type WithOpacity<T> = T & Opacity;
export type WithThemable<T> = T & Themable;
export type WithSize<T> = T & { size?: number };
export type WithPosition<T> = T & { position?: [number, number, number] };

// Common patterns
export type Maybe<T> = T | null | undefined;
export type Nullable<T> = T | null;
export type Undefinable<T> = T | undefined;
export type Async<T> = Promise<T>;

// Base data types
export interface BaseNodeData { [key: string]: unknown; pinned?: boolean; visible?: boolean; }
export interface BaseEdgeData { [key: string]: unknown; }

// Aliases for common types
export type AnyData = Record<string, unknown>;
export type DataMap = Map<string, unknown>;
export type DataRecord = Record<string, any>;

export interface LabelLodLevel {
  distance?: number;
  scale?: number;
  style?: string;
  min?: number;
  max?: number;
  label?: string;
}

// Node data types
export type ShapeNodeData = WithSize<WithColorable<WithOpacity<BaseNodeData>>> & {
  shape?: 'box' | 'sphere' | 'circle' | 'plane' | 'cone' | 'cylinder' | 'torus' | 'ring';
  wireframe?: boolean;
  transparent?: boolean;
  side?: 'front' | 'back' | 'double';
};

export type HtmlNodeData = WithDimensions<BaseNodeData> & {
  html?: string;
  className?: string;
  pointerEvents?: 'none' | 'auto';
  labelLod?: LabelLodLevel[];
};

export type ImageNodeData = WithDimensions<WithOpacity<BaseNodeData>> & { url?: string; };

export type GroupNodeData = WithDimensions<WithColorable<WithOpacity<BaseNodeData>>> & {
  depth?: number;
  wireframe?: boolean;
  title?: string;
};

export type NoteNodeData = WithDimensions<WithColorable<BaseNodeData>> & {
  text?: string;
  textColor?: string | number;
  fontSize?: number;
};

export type CanvasNodeData = WithDimensions<BaseNodeData> & { dpi?: number; };

export type TextMeshNodeData = WithColorable<BaseNodeData> & {
  text?: string;
  fontUrl?: string;
  size?: number;
  height?: number;
  align?: 'left' | 'center' | 'right';
};

export type DataNodeData = WithThemable<BaseNodeData> & { data?: unknown; expanded?: boolean; maxHeight?: number; };

export type VideoNodeData = WithDimensions<BaseNodeData> & {
  url?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
};

export type IFrameNodeData = WithDimensions<BaseNodeData> & { src?: string; scrolling?: 'yes' | 'no' | 'auto'; };

export type ChartNodeData = WithDimensions<WithThemable<BaseNodeData>> & {
  chartType?: 'bar' | 'line' | 'pie' | 'scatter' | 'radar';
  chartData?: unknown;
  chartOptions?: unknown;
};

export type MarkdownNodeData = WithDimensions<WithThemable<BaseNodeData>> & { content?: string; fontSize?: number; };

export interface GlobeNodeData extends BaseNodeData {
  radius?: number;
  resolution?: number;
  textureUrl?: string;
  markers?: { lat: number; lng: number; size?: number; color?: number | string; label?: string }[];
}

export interface SceneNodeData extends BaseNodeData {
  url?: string;
  targetSize?: number;
  autoCenter?: boolean;
}

export interface AudioNodeData extends BaseNodeData, Colorable {
  src?: string;
  autoplay?: boolean;
  loop?: boolean;
}

export type MathNodeData = WithDimensions<WithColorable<BaseNodeData>> & { math?: string; fontSize?: number; };

export interface ProcessNodeData extends BaseNodeData, Dimensions {
  pid?: string | number;
  name?: string;
  cpu?: number;
  memory?: number;
}

export interface CodeEditorNodeData extends BaseNodeData, Dimensions {
  code?: string;
  language?: string;
  theme?: string;
}

export type InstancedShapeNodeData = WithSize<WithColorable<WithOpacity<BaseNodeData>>> & {
  shape?: 'box' | 'sphere' | 'circle' | 'plane';
};

export type NodeData =
  | ShapeNodeData | HtmlNodeData | ImageNodeData | GroupNodeData | NoteNodeData | CanvasNodeData
  | TextMeshNodeData | DataNodeData | VideoNodeData | IFrameNodeData | ChartNodeData | MarkdownNodeData
  | GlobeNodeData | SceneNodeData | AudioNodeData | MathNodeData | ProcessNodeData | CodeEditorNodeData
  | InstancedShapeNodeData;

export type SpaceGraphNodeData = NodeData;

// Edge data types
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
  labelLod?: LabelLodLevel[];
}

// Specifications
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

// Events
export type GraphEvent = 'node:added' | 'node:removed' | 'node:updated' | 'edge:added' | 'edge:removed' | 'edge:updated';
export type NodeEvent = 'node:updated' | 'node:destroying';
export type EdgeEvent = 'edge:updated' | 'edge:destroying';

// Options
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
  [key: string]: unknown;
}

export interface DefaultInputConfig {
  enableCameraOrbit?: boolean;
  enableCameraPan?: boolean;
  enableCameraZoom?: boolean;
  enableHover?: boolean;
  enableBoxSelect?: boolean;
  enableDrag?: boolean;
  enableWidgets?: boolean;
  [key: string]: any;
}

// Animation
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

// Export/Import
export interface GraphExport {
  nodes: Array<{ id: string; type: string; label?: string; position: [number, number, number]; data: unknown }>;
  edges: Array<{ id: string; source: string; target: string; type: string; data: unknown }>;
  camera?: { position: [number, number, number]; target: [number, number, number] };
  plugins?: Record<string, unknown>;
}

export type GraphImportData = GraphExport;

// Layout types
export interface LayoutConfig {
  name: string;
  options?: Record<string, unknown>;
}

export interface LayoutOptions {
  animate?: boolean;
  duration?: number;
  easing?: string;
}

// Ergonomics
export interface ErgonomicsConfig {
  enableFittsLaw?: boolean;
  minTargetSize?: number;
  maxReachDistance?: number;
  preferredZone?: 'center' | 'top' | 'bottom';
}

// HUD
export interface HUDElementOptions {
  type: string;
  position?: [number, number];
  size?: [number, number];
  data?: Record<string, unknown>;
}

// History
export interface HistoryPluginOptions {
  maxHistory?: number;
  autoSave?: boolean;
  saveInterval?: number;
}

// Hover
export interface HoverMetaWidgetOptions {
  showLabel?: boolean;
  showType?: boolean;
  showData?: boolean;
}

export interface HoverAction {
  icon: string;
  label: string;
  action: string;
}

// Mermaid
export type MermaidThemeName = 'default' | 'forest' | 'dark' | 'neutral';
export type MermaidLayoutType = 'graph' | 'flowchart' | 'sequence' | 'class' | 'state' | 'gantt';
export type MermaidNodeShape = 'default' | 'circle' | 'ellipse' | 'rect' | 'diamond';
export type LayoutName = string;
export type GeometryFamily = string;

// App
export interface SpaceGraphAppOptions {
  container?: string | HTMLElement;
  theme?: 'light' | 'dark';
  plugins?: string[];
  initialLayout?: string;
}

// Logging
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

// Disposable
export interface Disposable {
  dispose(): void;
}

// Hit result
export interface HitResult {
  surface: any;
  point: any;
  localPoint: any;
  distance: number;
  normal?: any;
  uv?: any;
  face?: any;
}

// Rect and Bounds
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Bounds3D {
  min: any;
  max: any;
  center: any;
  size: any;
  containsPoint(p: any): boolean;
  intersectsRay(ray: any): boolean;
}

// Plugin system
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

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
}

// Constructors - re-export from core with proper typing
import type { Node } from './nodes/Node';
import type { Edge } from './edges/Edge';
import type { SpaceGraph } from './SpaceGraph';
import type { NodeSpec, EdgeSpec } from './types';

export type NodeConstructor = new (sg: SpaceGraph, spec: NodeSpec) => Node;
export type EdgeConstructor = new (sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) => Edge;

// Vision system
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

// Render options
export interface RenderOptions {
  antialias?: boolean;
  alpha?: boolean;
  backgroundColor?: string | number;
  pixelRatio?: number;
}

// SpaceGraph events
export interface SpaceGraphEvents {
  'node:added': any;
  'node:removed': any;
  'node:updated': any;
  'edge:added': any;
  'edge:removed': any;
  'edge:updated': any;
}

// Type aliases for ergonomics
export type NodeType = string;
export type EdgeType = string;

// Callback types
export type NodeCallback<T = any> = (node: T) => void;
export type EdgeCallback<T = any> = (edge: T) => void;
export type GraphCallback<T = any> = (graph: T) => void;

// Predicate types
export type NodePredicate<T = any> = (node: T) => boolean;
export type EdgePredicate<T = any> = (edge: T) => boolean;

// Result types
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };
export type Option<T> = { value: T } | { value: null };

// Event handling
export type EventHandler<T = any> = (event: T) => void;
export type EventMap = Record<string, any>;
export type WildcardEventHandler<T = any> = (event: string, data: T) => void;

// Cleanup
export type Disposer = () => void;
export type CleanupFunction = () => void | Promise<void>;
