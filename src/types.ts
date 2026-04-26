// Core type utilities
export type Primitive = string | number | boolean | null | undefined;
export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };
export type DeepReadonly<T> = { readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P] };
export type DeepRequired<T> = { [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P] };
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

// Type modifiers
export type WithDimensions<T> = T & Dimensions;
export type WithColorable<T> = T & Colorable;
export type WithOpacity<T> = T & Opacity;
export type WithThemable<T> = T & Themable;
export type WithSize<T> = T & { size?: number };
export type WithPosition<T> = T & { position?: [number, number, number] };

// Base data types
export interface BaseNodeData { [key: string]: unknown; pinned?: boolean; visible?: boolean; }
export interface BaseEdgeData { [key: string]: unknown; }

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
  [key: string]: unknown;
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

// Export
export interface GraphExport {
  nodes: Array<{ id: string; type: string; label?: string; position: [number, number, number]; data: unknown }>;
  edges: Array<{ id: string; source: string; target: string; type: string; data: unknown }>;
  camera?: { position: [number, number, number]; target: [number, number, number] };
  plugins?: Record<string, unknown>;
}
