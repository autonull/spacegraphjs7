// Minimal graph types for trace classification.
// The host provides these; the trace package never imports session vocabulary.

export interface TraceNode {
    id: string;
    kind: string;
    label: string;
    summary?: string;
    status?: string;
    turnID?: string;
    messageID?: string;
    partID?: string;
    toolID?: string;
    time?: number;
    derived?: boolean;
    minLevel?: string;
    clusterOf?: string[];
    data?: Record<string, unknown>;
}

export interface TraceEdge {
    id: string;
    kind: string;
    source: string;
    target: string;
    confidence?: string;
    label?: string;
    data?: Record<string, unknown>;
}

export interface TraceModel {
    root: string;
    nodes: readonly TraceNode[];
    edges: readonly TraceEdge[];
    turns: readonly string[];
    turnByMessageID: Map<string, string>;
    activeTurn?: string;
}

// Host-provided traversal functions.
export interface TraceTraversal {
    /** Direct incoming edges to a node. */
    incoming: (model: TraceModel, id: string) => readonly TraceEdge[];
    /** Direct outgoing edges from a node. */
    outgoing: (model: TraceModel, id: string) => readonly TraceEdge[];
    /** Ancestor chain via parent edges (root first). */
    ancestors: (model: TraceModel, id: string) => readonly TraceNode[];
    /** Nodes following in sequence order. */
    forwardChain: (model: TraceModel, id: string) => readonly TraceNode[];
    /** Downstream chain via sequence/produces/writes edges. */
    downstreamChain: (model: TraceModel, id: string) => readonly { node: TraceNode; edge: TraceEdge; confidence: string }[];
    /** Build a node index by ID. */
    nodeIndex: (model: TraceModel) => Map<string, TraceNode>;
    /** Build a parent index by child ID. */
    parentIndex: (model: TraceModel) => Map<string, string>;
    /** Build a child index by parent ID. */
    childIndex: (model: TraceModel) => Map<string, string[]>;
    /** Build a sequence index (next/previous). */
    sequenceIndex: (model: TraceModel) => { next: Map<string, string>; previous: Map<string, string> };
}

// Host-provided vocabulary sets.
export interface TraceVocabulary {
    /** Edge kinds that represent provenance (writes, reads, produces, evidence). */
    provenanceEdgeKinds: Set<string>;
    /** Edge kinds that represent read relationships. */
    readEdgeKinds: Set<string>;
    /** Edge kinds that represent downstream flow (sequence, produces, writes). */
    downstreamEdgeKinds: Set<string>;
}

/** The trace kinds the host exposes. Each trace answers one question. */
export type TraceKind = 'why' | 'led-here' | 'related' | 'downstream';

/** The result of classifying a trace overlay over the model. */
export interface TraceOverlay {
    /** Nodes that are the answer to the question. */
    answerIds: ReadonlySet<string>;
    /** Nodes that are context for the answer (lit but not the answer). */
    contextIds: ReadonlySet<string>;
    /** Edges that are part of the answer paths. */
    answerEdgeIds: ReadonlySet<string>;
    /** All edges that should be visible. */
    visibleEdgeIds: ReadonlySet<string>;
}

/** Configuration for trace classification. */
export interface TraceConfig {
    /** The model to classify traces over. */
    model: TraceModel;
    /** Host-provided traversal functions. */
    traversal: TraceTraversal;
    /** Host-provided vocabulary sets. */
    vocabulary: TraceVocabulary;
}