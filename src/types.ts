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
    markers?: { lat: number; lng: number; size?: number; color?: number | string; label?: string }[];
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
    | NoteNodeData
    | SceneNodeData
    | ShapeNodeData
    | TextMeshNodeData
    | VideoNodeData;

export interface NodeSpec<T = SpaceGraphNodeData> {
    id: string;
    type: string;
    label?: string;
    position?: [number, number, number];
    data?: T;
}

export interface EdgeSpec {
    id: string;
    source: string;
    target: string;
    type: string;
    data?: Record<string, any>;
}

export interface GraphSpec {
    nodes: NodeSpec[];
    edges: EdgeSpec[];
}

export interface SpaceGraphOptions {
    [key: string]: any;
}

export interface SpecUpdate {
    nodes?: Partial<NodeSpec>[];
    edges?: Partial<EdgeSpec>[];
}

export interface ISpaceGraphPlugin {
    readonly id: string;
    readonly name: string;
    readonly version: string;

    init(graph: any): void;
    onStateUpdate?(update: SpecUpdate): void;
    onPreRender?(delta: number): void;
    onPostRender?(delta: number): void;
    onNodeAdded?(node: any): void;
    onNodeRemoved?(id: string): void;
    onEdgeAdded?(edge: any): void;
    onEdgeRemoved?(id: string): void;
    dispose?(): void;
}
