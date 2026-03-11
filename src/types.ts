export interface BaseNodeData {
    [key: string]: any;
}

export interface CanvasNodeData extends BaseNodeData {
    width?: number;
    height?: number;
    dpi?: number;
}

export interface ChartNodeData extends BaseNodeData {
    chartType?: 'bar' | 'line' | 'pie' | 'scatter' | 'radar';
    chartData?: any;
    chartOptions?: any;
    width?: number;
    height?: number;
    theme?: 'light' | 'dark';
}

export interface DataNodeData extends BaseNodeData {
    data?: any;
    expanded?: boolean;
    theme?: 'light' | 'dark';
    width?: number;
    maxHeight?: number;
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

export interface GroupNodeData extends BaseNodeData {
    width?: number;
    height?: number;
    depth?: number;
    color?: string | number;
    opacity?: number;
    wireframe?: boolean;
    title?: string;
}

export interface HtmlNodeData extends BaseNodeData {
    html?: string;
    className?: string;
    width?: number;
    height?: number;
    pointerEvents?: 'none' | 'auto';
}

export interface IFrameNodeData extends BaseNodeData {
    src?: string;
    width?: number;
    height?: number;
    scrolling?: 'yes' | 'no' | 'auto';
}

export interface ImageNodeData extends BaseNodeData {
    url?: string;
    width?: number;
    height?: number;
    opacity?: number;
}

export interface InstancedShapeNodeData extends BaseNodeData {
    shape?: 'box' | 'sphere' | 'circle' | 'plane';
    color?: string | number;
    size?: number;
    opacity?: number;
}

export interface MarkdownNodeData extends BaseNodeData {
    content?: string;
    width?: number;
    theme?: 'light' | 'dark';
    fontSize?: number;
}

export interface NoteNodeData extends BaseNodeData {
    text?: string;
    width?: number;
    height?: number;
    color?: string | number;
    textColor?: string | number;
    fontSize?: number;
}

export interface ProcessNodeData extends BaseNodeData {
    pid?: string | number;
    name?: string;
    cpu?: number;
    memory?: number;
    width?: number;
    height?: number;
}

export interface SceneNodeData extends BaseNodeData {
    url?: string;
    targetSize?: number;
    autoCenter?: boolean;
}

export interface ShapeNodeData extends BaseNodeData {
    shape?: 'box' | 'sphere' | 'circle' | 'plane' | 'cone' | 'cylinder' | 'torus' | 'ring';
    color?: string | number;
    size?: number;
    opacity?: number;
    wireframe?: boolean;
    transparent?: boolean;
    side?: 'front' | 'back' | 'double';
}

export interface TextMeshNodeData extends BaseNodeData {
    text?: string;
    fontUrl?: string;
    color?: string | number;
    size?: number;
    height?: number;
    align?: 'left' | 'center' | 'right';
}

export interface VideoNodeData extends BaseNodeData {
    url?: string;
    width?: number;
    height?: number;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
}

export interface MathNodeData extends BaseNodeData {
    math?: string;
    width?: number;
    height?: number;
    color?: string | number;
    fontSize?: number;
}

export interface AudioNodeData extends BaseNodeData {
    src?: string;
    color?: string | number;
    autoplay?: boolean;
    loop?: boolean;
}

export interface CodeEditorNodeData extends BaseNodeData {
    code?: string;
    language?: string;
    theme?: string;
    width?: number;
    height?: number;
}

export type SpaceGraphNodeData =
    | BaseNodeData
    | CanvasNodeData
    | ChartNodeData
    | DataNodeData
    | GlobeNodeData
    | GroupNodeData
    | HtmlNodeData
    | IFrameNodeData
    | ImageNodeData
    | InstancedShapeNodeData
    | MarkdownNodeData
    | MathNodeData
    | NoteNodeData
    | SceneNodeData
    | ShapeNodeData
    | TextMeshNodeData
    | VideoNodeData
    | AudioNodeData
    | ProcessNodeData
    | CodeEditorNodeData;

/**
 * Specification for a single node in the graph.
 */
export interface NodeSpec<T = SpaceGraphNodeData> {
    /** Unique identifier for the node. */
    id: string;
    /** The class name of the node (e.g., 'ShapeNode', 'HtmlNode'). */
    type: string;
    /** Optional text label to display with the node. */
    label?: string;
    /** Optional initial position in 3D space [x, y, z]. */
    position?: [number, number, number];
    /** Configuration data specific to the node type. */
    data?: T;
}

/**
 * Specification for a single edge connecting two nodes in the graph.
 */
export interface EdgeSpec {
    /** Unique identifier for the edge. */
    id: string;
    /** The ID of the source node. */
    source: string;
    /** The ID of the target node. */
    target: string;
    /** The class name of the edge (e.g., 'Edge', 'CurvedEdge'). */
    type: string;
    /** Optional configuration data specific to the edge type. */
    data?: Record<string, any>;
}

/**
 * Specification for the entire graph structure.
 */
export interface GraphSpec {
    /** Array of nodes to render in the graph. */
    nodes: NodeSpec[];
    /** Array of edges connecting the nodes. */
    edges: EdgeSpec[];
}

/**
 * Configuration options for creating a SpaceGraph instance.
 */
export interface SpaceGraphOptions {
    /** Hardware Acceleration Hook: specify custom ONNX execution providers (e.g. ['rknn']) */
    onnxExecutionProviders?: string[];
    /** Arbitrary configuration options passed to plugins and renderers. */
    [key: string]: any;
}

export interface SpecUpdate {
    nodes?: Partial<NodeSpec>[];
    edges?: Partial<EdgeSpec>[];
}

/**
 * Interface that all SpaceGraph plugins must implement.
 */
export interface ISpaceGraphPlugin {
    /** Unique identifier for the plugin. */
    readonly id: string;
    /** Human-readable name of the plugin. */
    readonly name: string;
    /** Semantic version of the plugin. */
    readonly version: string;

    /** Called once when the plugin is registered with the graph. */
    init(graph: any): void;
    /** Called whenever the graph specification is updated. */
    onStateUpdate?(update: SpecUpdate): void;
    /** Called every frame before the main render pass. */
    onPreRender?(delta: number): void;
    /** Called every frame after the main render pass. */
    onPostRender?(delta: number): void;
    /** Called when a new node is added to the graph. */
    onNodeAdded?(node: any): void;
    /** Called when a node is removed from the graph. */
    onNodeRemoved?(id: string): void;
    /** Called when a new edge is added to the graph. */
    onEdgeAdded?(edge: any): void;
    /** Called when an edge is removed from the graph. */
    onEdgeRemoved?(id: string): void;
    /** Called when the graph is destroyed or the plugin is unregistered. */
    dispose?(): void;
    /** Called during graph serialization to save plugin state. */
    export?(): any;
    /** Called during graph deserialization to restore plugin state. */
    import?(data: any): void;
}
