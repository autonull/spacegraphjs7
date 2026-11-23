// Minimal graph types for trace classification.
// The host provides these; the trace package never imports session vocabulary.
import type { GraphEdge, GraphNode, GraphViewData } from '@spacegraphjs/kernel';

export type TraceNode = GraphNode & { summary?: string };
export type TraceEdge = GraphEdge & { label?: string; data?: Record<string, unknown> };
export type TraceModel = Omit<GraphViewData, 'nodes' | 'edges'> & {
    nodes: readonly TraceNode[];
    edges: readonly TraceEdge[];
};

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
    nodeIndex: (model: TraceModel) => ReadonlyMap<string, TraceNode>;
    /** Build a parent index by child ID. */
    parentIndex: (model: TraceModel) => ReadonlyMap<string, string>;
    /** Build a child index by parent ID. */
    childIndex: (model: TraceModel) => ReadonlyMap<string, readonly string[]>;
    /** Build a sequence index (next/previous). */
    sequenceIndex: (model: TraceModel) => { next: ReadonlyMap<string, string>; previous: ReadonlyMap<string, string> };
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