// Generic annotation types and storage for SpaceGraphJS.
// The host provides note-node creation and rendering.

export interface Annotation {
    /** Unique annotation ID. */
    id: string;
    /** The node ID this annotation targets. */
    target: string;
    /** The annotation body text. */
    body: string;
    /** Creation timestamp (epoch ms). */
    createdAt?: number;
    /** Optional host-specific metadata. */
    data?: Record<string, unknown>;
}

export type Annotations = Record<string, Annotation>;

export interface AnnotationStore {
    /** All annotations keyed by annotation ID. */
    annotations: Annotations;
    /** Set an annotation (create or update). */
    setAnnotation: (annotation: Annotation) => void;
    /** Delete an annotation by ID. */
    deleteAnnotation: (id: string) => void;
    /** Clear all annotations. */
    clearAnnotations: () => void;
    /** Get an annotation by ID. */
    getAnnotation: (id: string) => Annotation | undefined;
    /** Get all annotations targeting a specific node. */
    getAnnotationsForTarget: (targetId: string) => Annotation[];
    /** Get all annotation IDs. */
    getAnnotationIds: () => string[];
}

/**
 * Create an in-memory annotation store.
 * The host can provide a custom implementation (e.g., persisted to localStorage).
 */
export function createAnnotationStore(initial?: Annotations): AnnotationStore {
    const annotations: Annotations = { ...initial };

    return {
        get annotations() {
            return annotations;
        },
        setAnnotation: (annotation: Annotation) => {
            annotations[annotation.id] = annotation;
        },
        deleteAnnotation: (id: string) => {
            delete annotations[id];
        },
        clearAnnotations: () => {
            for (const key of Object.keys(annotations)) {
                delete annotations[key];
            }
        },
        getAnnotation: (id: string) => annotations[id],
        getAnnotationsForTarget: (targetId: string) =>
            Object.values(annotations).filter((a) => a.target === targetId),
        getAnnotationIds: () => Object.keys(annotations),
    };
}

/**
 * Host-supplied policy for creating note nodes from annotations.
 * This keeps the generic library free of OpenCode vocabulary.
 */
export interface NoteNodePolicy<NodeID> {
    /** Generate a note node ID from an annotation ID. */
    noteNodeID: (annotationID: string) => NodeID;
    /** The edge kind for the annotation relationship. */
    annotatesEdgeKind: string;
    /** Create a note node from an annotation and its target node.
     * Receives the full policy so it can use policy.noteNodeID, etc. */
    createNoteNode: (
        annotation: Annotation,
        targetNode: { id: string; turnID?: string; kind: string },
        policy: NoteNodePolicy<NodeID>,
    ) => {
        id: NodeID;
        kind: string;
        label: string;
        summary: string;
        status: string;
        minLevel: string;
        turnID?: string;
        time?: number;
        data: Record<string, unknown>;
    };
}

/**
 * Default note node policy for hosts that want a basic implementation.
 * The host can override any part.
 */
export function createDefaultNoteNodePolicy<NodeID>(
    noteNodeIDPrefix = "note:",
): NoteNodePolicy<NodeID> {
    const noteNodeID = (annotationID: string) => `${noteNodeIDPrefix}${annotationID}` as NodeID;
    const createNoteNode = (
        annotation: Annotation,
        targetNode: { id: string; turnID?: string; kind: string },
        policy: NoteNodePolicy<NodeID>,
    ) => {
        const turnID = targetNode.kind === "turn" ? targetNode.id : targetNode.turnID;
        return {
            id: policy.noteNodeID(annotation.id),
            kind: "note",
            label: annotation.body.split("\n")[0] || annotation.body,
            summary: annotation.body,
            status: "neutral",
            minLevel: "execution",
            ...(turnID === undefined ? {} : { turnID }),
            ...(annotation.createdAt === undefined ? {} : { time: annotation.createdAt }),
            data: { noteID: annotation.id, target: annotation.target },
        };
    };
    return {
        noteNodeID,
        annotatesEdgeKind: "annotates",
        createNoteNode,
    };
}

/**
 * Apply annotations to a graph model by adding note nodes and annotation edges.
 * The host supplies the model and a note node policy.
 */
export interface GraphNodeLike {
    id: string;
    kind: string;
    turnID?: string;
}

export interface GraphEdgeLike {
    id: string;
    kind: string;
    source: string;
    target: string;
    confidence?: string;
}

export interface GraphViewDataLike {
    nodes: ReadonlyArray<GraphNodeLike>;
    edges: ReadonlyArray<GraphEdgeLike>;
}

export interface WithAnnotationsResult<NodeID extends string = string> {
    nodes: Array<GraphNodeLike & { id: NodeID }>;
    edges: Array<GraphEdgeLike & { id: NodeID }>;
}

/**
 * Add note nodes and annotation edges to a graph model.
 * Returns a new model with the annotations applied.
 */
export function withAnnotations<NodeID extends string>(
    model: GraphViewDataLike,
    annotations: Annotations,
    policy: NoteNodePolicy<NodeID>,
): WithAnnotationsResult<NodeID> {
    const entries = Object.values(annotations);
    if (entries.length === 0) {
        return {
            nodes: model.nodes as Array<GraphNodeLike & { id: NodeID }>,
            edges: model.edges as Array<GraphEdgeLike & { id: NodeID }>,
        };
    }

    const nodes = new Map(model.nodes.map((node) => [node.id, node]));
    const noteNodes: (GraphNodeLike & { id: NodeID })[] = [];
    const noteEdges: (GraphEdgeLike & { id: NodeID })[] = [];

    for (const annotation of entries) {
        const target = nodes.get(annotation.target);
        if (!target) continue;

        const noteNode = policy.createNoteNode(annotation, target, policy);
        noteNodes.push(noteNode);

        const edgeID = `${policy.annotatesEdgeKind}:${annotation.id}` as NodeID;
        noteEdges.push({
            id: edgeID,
            kind: policy.annotatesEdgeKind,
            source: noteNode.id,
            target: annotation.target as NodeID,
            confidence: "explicit",
        });
    }

    if (noteNodes.length === 0) {
        return {
            nodes: model.nodes as Array<GraphNodeLike & { id: NodeID }>,
            edges: model.edges as Array<GraphEdgeLike & { id: NodeID }>,
        };
    }

    return {
        nodes: [...model.nodes, ...noteNodes] as Array<GraphNodeLike & { id: NodeID }>,
        edges: [...model.edges, ...noteEdges] as Array<GraphEdgeLike & { id: NodeID }>,
    };
}