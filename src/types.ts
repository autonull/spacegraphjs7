// SpaceGraphJS - Type Definitions
// Single source of truth for all type declarations

// ============================================================================
// Base Interfaces
// ============================================================================

export interface Dimensions {
    width?: number;
    height?: number;
}

export interface Colorable {
    color?: string | number;
}

export interface Opacity {
    opacity?: number;
}

export interface Themable {
    theme?: 'light' | 'dark';
}

// ============================================================================
// Node Data Types
// ============================================================================

export interface LabelLodConfig {
    distance: number;
    scale?: number;
    style?: string;
}

export interface BaseNodeData {
    [key: string]: unknown;
    pinned?: boolean;
    visible?: boolean;
}

export interface ShapeNodeData extends BaseNodeData, Colorable, Opacity {
    shape?: 'box' | 'sphere' | 'circle' | 'plane' | 'cone' | 'cylinder' | 'torus' | 'ring';
    size?: number;
    wireframe?: boolean;
    transparent?: boolean;
    side?: 'front' | 'back' | 'double';
}

export interface HtmlNodeData extends BaseNodeData, Dimensions {
    html?: string;
    className?: string;
    pointerEvents?: 'none' | 'auto';
    labelLod?: LabelLodConfig[];
}

export interface ImageNodeData extends BaseNodeData, Dimensions, Opacity {
    url?: string;
}

export interface GroupNodeData extends BaseNodeData, Dimensions, Colorable, Opacity {
    depth?: number;
    wireframe?: boolean;
    title?: string;
}

export interface NoteNodeData extends BaseNodeData, Dimensions, Colorable {
    text?: string;
    textColor?: string | number;
    fontSize?: number;
}

export interface CanvasNodeData extends BaseNodeData, Dimensions {
    dpi?: number;
}

export interface TextMeshNodeData extends BaseNodeData, Colorable {
    text?: string;
    fontUrl?: string;
    size?: number;
    height?: number;
    align?: 'left' | 'center' | 'right';
}

export interface DataNodeData extends BaseNodeData, Themable {
    data?: unknown;
    expanded?: boolean;
    maxHeight?: number;
}

export interface VideoNodeData extends BaseNodeData, Dimensions {
    url?: string;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
}

export interface IFrameNodeData extends BaseNodeData, Dimensions {
    src?: string;
    scrolling?: 'yes' | 'no' | 'auto';
}

export interface ChartNodeData extends BaseNodeData, Dimensions, Themable {
    chartType?: 'bar' | 'line' | 'pie' | 'scatter' | 'radar';
    chartData?: unknown;
    chartOptions?: unknown;
}

export interface MarkdownNodeData extends BaseNodeData, Dimensions, Themable {
    content?: string;
    fontSize?: number;
}

export interface GlobeNodeData extends BaseNodeData {
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

export interface MathNodeData extends BaseNodeData, Dimensions, Colorable {
    math?: string;
    fontSize?: number;
}

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

export interface InstancedShapeNodeData extends BaseNodeData, Colorable, Opacity {
    shape?: 'box' | 'sphere' | 'circle' | 'plane';
    size?: number;
}

// Union of all node data types
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
    | InstancedShapeNodeData;

export type SpaceGraphNodeData = NodeData;

// ============================================================================
// Edge Data Types
// ============================================================================

export interface BaseEdgeData {
    [key: string]: unknown;
}

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
    fontSize?: string;
    labelLod?: LabelLodConfig[];
}

// ============================================================================
// Spec Types
// ============================================================================

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
    type: string;
    data?: T;
}

export interface GraphSpec {
    nodes: NodeSpec[];
    edges: EdgeSpec[];
}

export interface GraphExport {
    nodes: Array<{
        id: string;
        type: string;
        label?: string;
        position: [number, number, number];
        data: unknown;
    }>;
    edges: Array<{
        id: string;
        source: string;
        target: string;
        type: string;
        data: unknown;
    }>;
    camera?: {
        position: [number, number, number];
        target: [number, number, number];
    };
    plugins?: Record<string, unknown>;
}

// ============================================================================
// Event Types
// ============================================================================

export type GraphEvent =
    | 'node:added'
    | 'node:removed'
    | 'node:updated'
    | 'edge:added'
    | 'edge:removed'
    | 'edge:updated';

export type NodeEvent = 'updated' | 'destroying';

export type EdgeEvent = 'updated' | 'destroying';

// ============================================================================
// Plugin & Configuration Types
// ============================================================================

export interface SpaceGraphOptions {
    onnxExecutionProviders?: string[];
    [key: string]: unknown;
}

export interface SpecUpdate {
    nodes?: Partial<NodeSpec>[];
    edges?: Partial<EdgeSpec>[];
}

export interface ISpaceGraphPlugin {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    init(graph: unknown): void;
    onStateUpdate?(update: SpecUpdate): void;
    onPreRender?(delta: number): void;
    onPostRender?(delta: number): void;
    onNodeAdded?(node: unknown): void;
    onNodeRemoved?(id: string): void;
    onEdgeAdded?(edge: unknown): void;
    onEdgeRemoved?(id: string): void;
    dispose?(): void;
    export?(): unknown;
    import?(data: unknown): void;
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
