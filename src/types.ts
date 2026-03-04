export interface NodeSpec {
    id: string;
    type: string;
    label?: string;
    position?: [number, number, number];
    data?: Record<string, any>;
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
