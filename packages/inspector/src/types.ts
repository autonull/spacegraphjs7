import type { JSX } from 'solid-js';

export interface Provenance {
    source: string;
    asOf?: number;
    confidence?: 'explicit' | 'structural' | 'inferred';
}

export interface GraphEdge {
    from: string;
    to: string;
    kind?: string;
}

export interface GraphNode {
    id: string;
    label: string;
    kind?: string;
    summary?: string;
    provenance?: Provenance;
    data?: Record<string, unknown>;
}

export interface GraphViewData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export type InspectorProps = {
    model: GraphViewData;
    node?: GraphNode;
    traceKind?: 'why' | 'led-here' | 'related';
    onTraceWhy?: () => void;
    onTraceLedHere?: () => void;
    onTraceRelated?: () => void;
    onClearTrace?: () => void;
    onCopyTraceOutline?: () => void;
    onEditNote?: (id: string, text: string) => void;
    onDeleteNote?: (id: string) => void;
    onCopyNote?: (id: string) => void;
    onSelect?: (id: string) => void;
    onOpenTranscript?: (messageID: string, partID?: string) => void;
    link?: (node: GraphNode) => JSX.Element;
    t: (key: string) => string;
    plural?: (
        key: string,
        count: number,
        params?: Record<string, string | number | boolean | undefined>,
    ) => string;
    formatProvenance?: (provenance: Provenance | undefined, now: number) => string | undefined;
    formatOutput?: (data: unknown) => string | undefined;
};

export type ProvenanceDisplayProps = {
    provenance: Provenance | undefined;
    now: number;
    t: (key: string) => string;
    formatProvenance?: (provenance: Provenance | undefined, now: number) => string | undefined;
};

export type OutputDisplayProps = {
    output: string | undefined;
    t: (key: string) => string;
    formatOutput?: (data: unknown) => string | undefined;
};
