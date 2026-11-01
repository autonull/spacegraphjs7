// Base data interfaces - core shared data structures for nodes and edges

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
  /** Whether the node answers the pointer at all. A backdrop (a band, a label) does not. */
  interactive?: boolean;
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
  /** Background pill colour behind an edge label. */
  labelBackground?: string;
  fontSize?: number;
  /** Optional pick radius (px) for easier edge clicking. Defaults to the raycaster line threshold. */
  hitWidth?: number;
  labelLod?: LabelLodLevel[];
}