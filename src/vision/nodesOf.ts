type NodeSource = { getNodes?: () => unknown; nodes?: unknown };

/** Read the nodes from a graph-like value, whether it exposes getNodes() or a `nodes` Map. */
export function nodesOf(graph: unknown): unknown[] {
    if (!graph || typeof graph !== 'object') return [];

    const source = graph as NodeSource;
    if (source.getNodes) {
        const nodes = source.getNodes();
        const values =
            nodes && typeof nodes === 'object' && 'values' in nodes ? nodes.values : null;
        return Array.from(
            typeof values === 'function' ? values.call(nodes) : (nodes as Iterable<unknown>),
        );
    }
    if (source.nodes instanceof Map) return Array.from(source.nodes.values());
    return [];
}
