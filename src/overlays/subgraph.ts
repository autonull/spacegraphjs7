// Generic scoped subgraph: the nodes and edges of a small neighbourhood around one node. The core
// owns the algorithm; the host owns the vocabulary (which edge links a child to its parent, which
// children rank highest).

export interface OverlayNode {
    id: string;
    kind: string;
}

export interface OverlayEdge {
    id: string;
    source: string;
    target: string;
    kind: string;
}

export interface OverlayModel<Node extends OverlayNode = OverlayNode, Edge extends OverlayEdge = OverlayEdge> {
    nodes: readonly Node[];
    edges: readonly Edge[];
}

export interface ScopedSubgraph<Node extends OverlayNode = OverlayNode, Edge extends OverlayEdge = OverlayEdge> {
    /** The scoped nodes, in model order. */
    nodes: readonly Node[];
    /** The edges between the scoped nodes, in model order. */
    edges: readonly Edge[];
    /** The scope root; undefined when the model has no such node. */
    root: Node | undefined;
}

export interface ExtractSubgraphOptions<Node extends OverlayNode = OverlayNode> {
    /** The maximum number of nodes in the scope, the root included. */
    limit?: number;
    /** The edge kind that links a child to its parent. */
    childEdgeKind?: string;
    /** Ranks a child; a lower rank is more important. Ties keep the model order. */
    rankFn?: (node: Node) => number;
}

/** The containment edge a scoped subgraph walks by default. */
export const CHILD_EDGE_KIND = 'part-of';

const DEFAULT_LIMIT = 7;

/**
 * The scope around one node: the node itself, its highest-ranked children, and the edges between
 * them. A missing root yields an empty scope, so an overlay over a node the model does not hold
 * shows nothing instead of throwing.
 */
export function extractSubgraph<Node extends OverlayNode, Edge extends OverlayEdge>(
    model: OverlayModel<Node, Edge>,
    nodeId: string,
    options: ExtractSubgraphOptions<Node> = {},
): ScopedSubgraph<Node, Edge> {
    const root = model.nodes.find((node) => node.id === nodeId);

    if (!root) return { nodes: [], edges: [], root: undefined };

    const limit = Math.max(1, options.limit ?? DEFAULT_LIMIT);
    const childEdgeKind = options.childEdgeKind ?? CHILD_EDGE_KIND;
    const rank = options.rankFn ?? (() => 0);
    const byID = new Map(model.nodes.map((node) => [node.id, node]));

    const children = model.edges
        .filter((edge) => edge.kind === childEdgeKind && edge.target === nodeId)
        .map((edge) => byID.get(edge.source))
        .filter((node): node is Node => node !== undefined)
        .sort((a, b) => rank(a) - rank(b));

    const chosen = new Set([root.id, ...children.slice(0, limit - 1).map((node) => node.id)]);

    return {
        nodes: model.nodes.filter((node) => chosen.has(node.id)),
        edges: model.edges.filter((edge) => chosen.has(edge.source) && chosen.has(edge.target)),
        root,
    };
}
