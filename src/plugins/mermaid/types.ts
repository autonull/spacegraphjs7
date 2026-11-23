export type DiagramFormat = 'mermaid' | 'dot' | 'graphml' | 'json';
export type MermaidLayoutType = 'TD' | 'TB' | 'BT' | 'LR' | 'RL';
export type MermaidNodeShape =
    | 'rect'
    | 'round'
    | 'stadium'
    | 'circle'
    | 'diamond'
    | 'hexagon'
    | 'parallelogram'
    | 'parallelogram_alt'
    | 'trapezoid'
    | 'subroutine'
    | 'cylinder';
export type EdgeStyle = 'solid' | 'dashed' | 'dotted' | 'bold' | 'tapered';

/** The palette a diagram is drawn with: the node colours and the edge colour. */
export interface DiagramTheme {
    nodeColors: readonly string[];
    edgeColor: number;
}

export interface DiagramNode {
    id: string;
    label: string;
    shape: string;
    cluster?: string;
    style?: string;
    color?: string;
    fontColor?: string;
    width?: number;
    height?: number;
}

export interface DiagramEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
    style?: EdgeStyle;
    color?: string;
    arrowhead?: 'normal' | 'none' | 'tee' | 'odot' | 'crow' | 'diamond';
    direction?: 'forward' | 'back' | 'both' | 'none';
}

export interface DiagramCluster {
    id: string;
    label: string;
    color?: string;
    style?: string;
}

export interface DiagramParseResult {
    nodes: DiagramNode[];
    edges: DiagramEdge[];
    clusters: DiagramCluster[];
    format: DiagramFormat;
    suggestedLayout: string;
    metadata?: Record<string, unknown>;
}
