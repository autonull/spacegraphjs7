// Generic text search over a graph model: the nodes whose fields contain the query. The core owns
// the matching; the host owns the fields (a label, a summary, a tool name, a path, a command).

export interface SearchableNode {
    id: string;
}

export interface SearchModel<Node extends SearchableNode = SearchableNode> {
    nodes: readonly Node[];
}

/**
 * The rank of a node for a query: the lower the better, and a negative rank rules the node out.
 */
export type SearchScore = number;

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

/**
 * The nodes that match the query, best match first. The score function decides what a match is
 * worth; a negative score rules the node out.
 */
export function searchBy<Node extends SearchableNode>(
    model: SearchModel<Node>,
    query: string,
    scoreFn: (node: Node, needle: string) => SearchScore,
    limit?: number,
): Node[] {
    const needle = query.trim().toLowerCase();

    if (!needle) return [];

    const unbounded = limit === undefined || !Number.isFinite(limit);
    const max = unbounded ? Infinity : Math.max(0, limit!);
    const ranked: Array<{ node: Node; score: SearchScore }> = [];
    for (const node of model.nodes) {
        const score = scoreFn(node, needle);
        if (score < 0) continue;
        const entry = { node, score };
        if (unbounded) {
            ranked.push(entry);
            continue;
        }
        // Keep only `limit` hits: one insertion into a short ranked list per match instead of
        // sorting every match on each keystroke.
        let index = ranked.findIndex((kept) => kept.score > score);
        if (index === -1) index = ranked.length;
        if (index === ranked.length && ranked.length >= max) continue;
        ranked.splice(index, 0, entry);
        if (ranked.length > max) ranked.pop();
    }
    if (unbounded) ranked.sort((a, b) => a.score - b.score);
    return ranked.map((entry) => entry.node);
}
