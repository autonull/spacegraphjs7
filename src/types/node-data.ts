// Node data types - all node-specific data interfaces

import type { CoreNodeData, LabelLodLevel } from './base-data';

// Consolidated node data types
export interface ShapeNodeData extends CoreNodeData {
  shape?: 'box' | 'sphere' | 'circle' | 'plane' | 'cone' | 'cylinder' | 'torus' | 'ring';
  size?: number;
  side?: 'front' | 'back' | 'double';
}

export interface HtmlNodeData extends CoreNodeData {
  /** Raw HTML content to render inside the node. Takes precedence over `content`. */
  html?: string;
  /** Plain text content; used as fallback when `html` is not set. */
  content?: string;
  /** CSS class name(s) for the node's container element. */
  className?: string;
  /** Pointer events mode for the container. Default: 'auto'. */
  pointerEvents?: 'none' | 'auto';
  /** LOD levels for label rendering at different distances. */
  labelLod?: LabelLodLevel[];
  /** Inline style overrides for the container element. */
  style?: Record<string, string>;
  /** Background color of the node (CSS color string). Default: theme-based blue. */
  backgroundColor?: string | number;
  /** Border color of the node (CSS color string). Default: white. */
  borderColor?: string | number;
  /** Border width in pixels. Default: 2. */
  borderWidth?: number;
  /** Border radius in pixels. Default: 8. */
  borderRadius?: number | string;
  /** Padding inside the node. Default: '0'. */
  padding?: string | number;
  /** Font size for text content. Default: inherited. */
  fontSize?: number | string;
  /** Line height for text content. Default: inherited. */
  lineHeight?: number | string;
  /** Text color. Default: white. */
  color?: string | number;
  /** Whether to render raw HTML without default card styling. Default: false. */
  useRawHtml?: boolean;
  /** Whether the content is editable. Default: false. */
  editable?: boolean;
  /** Whether this node acts as a group container. Default: false. */
  group?: boolean;
  /** Whether to show built-in control buttons (zoom, resize, delete). Default: true. */
  showControls?: boolean;
  /** Title text for the node's title bar. */
  title?: string;
  /** Theme for the title bar: 'dark' or 'light'. Default: 'dark'. */
  theme?: 'dark' | 'light';
  /** Content scale factor for zooming the inner content. Default: 1. */
  contentScale?: number;
  /** Whether the node should billboard (face the camera). Default: false. */
  billboard?: boolean;
  /** Initial width in pixels. Default: 200. */
  width?: number;
  /** Initial height in pixels. Default: 100. */
  height?: number;
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

// Unified SpaceGraph Node Data - union of all node data types
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

// For backwards compatibility - combines NodeData with HtmlNodeData
export type SpaceGraphNodeData = NodeData & HtmlNodeData;