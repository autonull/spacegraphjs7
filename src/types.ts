export type BaseNodeData = { [key: string]: unknown };

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

export interface CanvasNodeData extends BaseNodeData, Dimensions {
    dpi?: number;
}
export interface ChartNodeData extends BaseNodeData, Dimensions, Themable {
    chartType?: 'bar' | 'line' | 'pie' | 'scatter' | 'radar';
    chartData?: unknown;
    chartOptions?: unknown;
}
export interface DataNodeData extends BaseNodeData, Themable {
    data?: unknown;
    expanded?: boolean;
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
export interface GroupNodeData extends BaseNodeData, Dimensions, Colorable, Opacity {
    depth?: number;
    wireframe?: boolean;
    title?: string;
}
export interface HtmlNodeData extends BaseNodeData, Dimensions {
    html?: string;
    className?: string;
    pointerEvents?: 'none' | 'auto';
}
export interface IFrameNodeData extends BaseNodeData, Dimensions {
    src?: string;
    scrolling?: 'yes' | 'no' | 'auto';
}
export interface ImageNodeData extends BaseNodeData, Dimensions, Opacity {
    url?: string;
}
export interface InstancedShapeNodeData extends BaseNodeData, Colorable, Opacity {
    shape?: 'box' | 'sphere' | 'circle' | 'plane';
    size?: number;
}
export interface MarkdownNodeData extends BaseNodeData, Dimensions, Themable {
    content?: string;
    fontSize?: number;
}
export interface NoteNodeData extends BaseNodeData, Dimensions, Colorable {
    text?: string;
    textColor?: string | number;
    fontSize?: number;
}
export interface ProcessNodeData extends BaseNodeData, Dimensions {
    pid?: string | number;
    name?: string;
    cpu?: number;
    memory?: number;
}
export interface SceneNodeData extends BaseNodeData {
    url?: string;
    targetSize?: number;
    autoCenter?: boolean;
}
export interface ShapeNodeData extends BaseNodeData, Colorable, Opacity {
    shape?: 'box' | 'sphere' | 'circle' | 'plane' | 'cone' | 'cylinder' | 'torus' | 'ring';
    size?: number;
    wireframe?: boolean;
    transparent?: boolean;
    side?: 'front' | 'back' | 'double';
}
export interface TextMeshNodeData extends BaseNodeData, Colorable {
    text?: string;
    fontUrl?: string;
    size?: number;
    height?: number;
    align?: 'left' | 'center' | 'right';
}
export interface VideoNodeData extends BaseNodeData, Dimensions {
    url?: string;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
}
export interface MathNodeData extends BaseNodeData, Dimensions, Colorable {
    math?: string;
    fontSize?: number;
}
export interface AudioNodeData extends BaseNodeData, Colorable {
    src?: string;
    autoplay?: boolean;
    loop?: boolean;
}
export interface CodeEditorNodeData extends BaseNodeData, Dimensions {
    code?: string;
    language?: string;
    theme?: string;
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

export interface NodeSpec<T = SpaceGraphNodeData> {
    id: string;
    type: string;
    label?: string;
    position?: [number, number, number];
    data?: T;
    parameters?: Record<string, unknown>;
}

export interface EdgeSpec {
    id: string;
    source: string;
    target: string;
    type: string;
    data?: Record<string, unknown>;
}

export interface GraphSpec {
    nodes: NodeSpec[];
    edges: EdgeSpec[];
}

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
