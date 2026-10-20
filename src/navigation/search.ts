// Generic text search over a graph model: the nodes whose fields contain the query. The core owns
// the matching; the host owns the fields (a label, a summary, a tool name, a path, a command).

export interface SearchableNode {
    id: string;
}

export interface SearchModel<Node extends SearchableNode = SearchableNode> {
    nodes: readonly Node[];
}

/**
 * The nodes whose fields contain the query, in model order. The fields of a node are joined with a
 * newline before matching, so a query cannot span two fields by accident.
 */
export function search<Node extends SearchableNode>(
    model: SearchModel<Node>,
    query: string,
    fieldsFn: (node: Node) => readonly string[],
): Node[] {
    const needle = query.trim().toLowerCase();

    if (!needle) return [];

    return model.nodes.filter((node) => fieldsFn(node).join('\n').toLowerCase().includes(needle));
}
