// types.ts - Ergonomic TypeScript types
import type { Node } from './nodes/Node';
import type { Edge } from './edges/Edge';
import type { SpaceGraph } from './SpaceGraph';

// ============= Utility Types =============
export type Maybe<T> = T | null | undefined;
export type MaybePromise<T> = T | Promise<T>;
export type Constructor<T, Args extends unknown[] = unknown[]> = new (...args: Args) => T;
export type Predicate<T> = (value: T) => boolean;
export type EventHandler<T = any> = (event: T) => void;
export type Disposer = () => void;
export type Nullable<T> = T | null;
export type Optional<T> = Partial<T>;
export type Awaited<T> = T extends Promise<infer U> ? U : T;

// ============= Geometry Types =============
export interface Rect { x: number; y: number; width: number; height: number; }
export interface Point2D { x: number; y: number; }
export interface Point3D { x: number; y: number; z: number; }
export interface Bounds3D {
  min: any; max: any; center: any; size: any;
  containsPoint(p: any): boolean;
  intersectsRay(ray: any): boolean;
}

// ============= Base Data Types =============
export interface BaseNodeData { [key: string]: unknown; pinned?: boolean; visible?: boolean; }
export interface BaseEdgeData { [key: string]: unknown; }
export interface LabelLodLevel { distance?: number; scale?: number; style?: string; min?: number; max?: number; label?: string; }

// ============= Node Data Types =============
export interface ShapeNodeData extends BaseNodeData {
  shape?: 'box' | 'sphere' | 'circle' | 'plane' | 'cone' | 'cylinder' | 'torus' | 'ring';
  size?: number; color?: string | number; opacity?: number; wireframe?: boolean; transparent?: boolean; side?: 'front' | 'back' | 'double';
}
export interface HtmlNodeData extends BaseNodeData {
  width?: number; height?: number; html?: string; className?: string; pointerEvents?: 'none' | 'auto'; labelLod?: LabelLodLevel[];
}
export interface ImageNodeData extends BaseNodeData { width?: number; height?: number; opacity?: number; url?: string; }
export interface GroupNodeData extends BaseNodeData {
  width?: number; height?: number; color?: string | number; opacity?: number; depth?: number; wireframe?: boolean; title?: string;
}
export interface NoteNodeData extends BaseNodeData {
  width?: number; height?: number; color?: string | number; text?: string; textColor?: string | number; fontSize?: number;
}
export interface CanvasNodeData extends BaseNodeData { width?: number; height?: number; dpi?: number; }
export interface TextMeshNodeData extends BaseNodeData {
  color?: string | number; text?: string; fontUrl?: string; size?: number; height?: number; align?: 'left' | 'center' | 'right';
}
export interface DataNodeData extends BaseNodeData { theme?: 'light' | 'dark'; data?: unknown; expanded?: boolean; maxHeight?: number; }
export interface VideoNodeData extends BaseNodeData {
  width?: number; height?: number; url?: string; autoplay?: boolean; loop?: boolean; muted?: boolean;
}
export interface IFrameNodeData extends BaseNodeData { width?: number; height?: number; src?: string; scrolling?: 'yes' | 'no' | 'auto'; }
export interface ChartNodeData extends BaseNodeData {
  width?: number; height?: number; theme?: 'light' | 'dark';
  chartType?: 'bar' | 'line' | 'pie' | 'scatter' | 'radar'; chartData?: unknown; chartOptions?: unknown;
}
export interface MarkdownNodeData extends BaseNodeData { width?: number; height?: number; theme?: 'light' | 'dark'; content?: string; fontSize?: number; }
export interface GlobeNodeData extends BaseNodeData {
  radius?: number; resolution?: number; textureUrl?: string;
  markers?: { lat: number; lng: number; size?: number; color?: number | string; label?: string }[];
}
export interface SceneNodeData extends BaseNodeData { url?: string; targetSize?: number; autoCenter?: boolean; }
export interface AudioNodeData extends BaseNodeData { color?: string | number; src?: string; autoplay?: boolean; loop?: boolean; }
export interface MathNodeData extends BaseNodeData { width?: number; height?: number; color?: string | number; math?: string; fontSize?: number; }
export interface ProcessNodeData extends BaseNodeData {
  width?: number; height?: number; pid?: string | number; name?: string; cpu?: number; memory?: number;
}
export interface CodeEditorNodeData extends BaseNodeData { width?: number; height?: number; code?: string; language?: string; theme?: string; }
export interface InstancedShapeNodeData extends BaseNodeData { shape?: 'box' | 'sphere' | 'circle' | 'plane'; size?: number; color?: string | number; opacity?: number; }

export type NodeData =
  | ShapeNodeData | HtmlNodeData | ImageNodeData | GroupNodeData | NoteNodeData | CanvasNodeData
  | TextMeshNodeData | DataNodeData | VideoNodeData | IFrameNodeData | ChartNodeData | MarkdownNodeData
  | GlobeNodeData | SceneNodeData | AudioNodeData | MathNodeData | ProcessNodeData | CodeEditorNodeData | InstancedShapeNodeData;

// Unified SpaceGraph Node Data
export type SpaceGraphNodeData = NodeData & HtmlNodeData;

// ============= Edge Data Types =============
export interface EdgeData extends BaseEdgeData {
  color?: number; gradientColors?: [string, string]; thickness?: number; thicknessInstanced?: number;
  arrowhead?: boolean | 'source' | 'target' | 'both'; arrowheadSize?: number; arrowheadColor?: number;
  dashed?: boolean; dashScale?: number; dashSize?: number; gapSize?: number;
  label?: string; labelColor?: string; fontSize?: number; labelLod?: LabelLodLevel[];
}

// ============= Specification Types =============
export interface NodeSpec<T extends NodeData = NodeData> {
  id: string; type: string; label?: string;
  position?: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number];
  data?: T; parameters?: Record<string, unknown>;
}
export interface EdgeSpec<T extends EdgeData = EdgeData> {
  id: string; source: string; target: string; type?: string; data?: T;
}
export interface GraphSpec {
  nodes?: NodeSpec[]; edges?: EdgeSpec[];
  camera?: { position: [number, number, number]; target: [number, number, number] };
}
export interface SpecUpdate { nodes?: Partial<NodeSpec>[]; edges?: Partial<EdgeSpec>[]; }

// ============= Event Types =============
export type GraphEvent = 'node:added' | 'node:removed' | 'node:updated' | 'edge:added' | 'edge:removed' | 'edge:updated';
export type NodeEvent = 'node:updated' | 'node:destroying';
export type EdgeEvent = 'edge:updated' | 'edge:destroying';
export interface SpaceGraphEvents {
  'node:added': any; 'node:removed': any; 'node:updated': any;
  'edge:added': any; 'edge:removed': any; 'edge:updated': any;
}

// ============= Options Types =============
export interface SpaceGraphOptions {
  onnxExecutionProviders?: string[];
  vision?: { wasmPaths?: string; heuristics?: { wcagThreshold?: number; overlapPadding?: number; fittsLawTargetSize?: number } };
  initialLayout?: string;
  cameraControls?: Partial<import('./core/CameraControls').CameraControlsConfig>;
  input?: DefaultInputConfig;
  [key: string]: unknown;
}

// Input configuration
export interface DefaultInputConfig {
  camera?: CameraInputConfig;
  interaction?: InteractionInputConfig;
  history?: HistoryInputConfig;
}
export interface CameraInputConfig {
  enableCameraOrbit?: boolean; enableCameraPan?: boolean; enableCameraZoom?: boolean;
  rotationSpeed?: number; panSpeed?: number; zoomSpeed?: number;
  damping?: number; minRadius?: number; maxRadius?: number;
}
export interface InteractionInputConfig {
  enableHover?: boolean; enableBoxSelect?: boolean; enableDrag?: boolean; enableWidgets?: boolean;
  clickThreshold?: number;
}
export interface HistoryInputConfig { enabled?: boolean; }

export interface RenderOptions { antialias?: boolean; alpha?: boolean; backgroundColor?: string | number; pixelRatio?: number; }
export interface AnimationProps {
  x?: number; y?: number; z?: number; scale?: number;
  duration?: number; ease?: string; delay?: number; onUpdate?: () => void;
}

// ============= Export/Import Types =============
export interface GraphExport {
  nodes: Array<{ id: string; type: string; label?: string; position: [number, number, number]; data: unknown }>;
  edges: Array<{ id: string; source: string; target: string; type: string; data: unknown }>;
  camera?: { position: [number, number, number]; target: [number, number, number] };
  plugins?: Record<string, unknown>;
}
export type GraphImportData = GraphExport;

// ============= Plugin System Types =============
export interface PluginLifecycle {
  init?(sg: any, graph: any, events: any): void | Promise<void>;
  onPreRender?(delta: number): void; onPostRender?(delta: number): void;
  onNodeAdded?(node: any): void; onNodeRemoved?(node: any): void;
  onEdgeAdded?(edge: any): void; onEdgeRemoved?(edge: any): void;
  dispose?(): void; export?(): unknown; import?(data: unknown): void;
}
export interface Plugin extends PluginLifecycle { readonly id: string; readonly name: string; readonly version: string; }

// ============= Constructor Types =============
export type NodeConstructor = new (sg: SpaceGraph, spec: NodeSpec) => Node;
export type EdgeConstructor = new (sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) => Edge;

// ============= Vision Types =============
export type VisionCategory = 'wcag' | 'overlap' | 'fitts' | 'all';
export interface VisionOptions { enabled?: boolean; categories?: VisionCategory[]; threshold?: number; }
export interface VisionReport { score: number; issues: Array<{ type: string; severity: number; message: string }>; }
export interface VisionScore { wcag: number; overlap: number; fitts: number; overall: number; }

// ============= Alias Types =============
export type NodeType = string;
export type EdgeType = string;
export type GeometryFamily = string;
export type HitResult = any;
export type LayoutName = string;
export type MermaidThemeName = 'default' | 'forest' | 'dark' | 'neutral';
export type MermaidLayoutType = 'graph' | 'flowchart' | 'sequence' | 'class' | 'state' | 'gantt';
export type MermaidNodeShape = 'default' | 'circle' | 'ellipse' | 'rect' | 'diamond';

// ============= Layout Types =============
export interface LayoutConfig { type: LayoutName; options?: LayoutOptions; }
export interface LayoutOptions extends Record<string, unknown> { duration?: number; easing?: string; }

// ============= Utility Aliases =============
export type { LogLevel as LogLevel } from './utils/logger';
export type { Logger as Logger } from './utils/logger';
