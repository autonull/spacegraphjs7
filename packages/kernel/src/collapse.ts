import type { GraphNode, GraphViewData } from '@spacegraphjs/shared';

/**
 * Collapse groups in the graph model.
 *
 * A collapsed group is model state, not a renderer special case. The group node stays
 * (and carries its member count); the members it names are hidden with their incident
 * edges. Positions of everything else are untouched, so collapse never re-lays-out the map.
 *
 * @param model The graph view data
 * @param collapsed Set of group node IDs that should be collapsed
 * @returns New GraphViewData with collapsed group members and their edges hidden
 */
export function collapseGroups(
    model: GraphViewData,
    collapsed: ReadonlySet<string>,
): GraphViewData {
    if (collapsed.size === 0) return model;

    const hidden = new Set<string>();
    for (const node of model.nodes) {
        if (!collapsed.has(node.id)) continue;
        for (const member of node.clusterOf ?? []) hidden.add(member);
    }
    if (hidden.size === 0) return model;

    return {
        ...model,
        nodes: model.nodes.filter((node) => !hidden.has(node.id)),
        edges: model.edges.filter((edge) => !hidden.has(edge.source) && !hidden.has(edge.target)),
        turns: model.turns?.filter((turn) => !hidden.has(turn)),
        activeTurn:
            model.activeTurn !== undefined && !hidden.has(model.activeTurn) ? model.activeTurn : undefined,
    };
}

/**
 * Check if a node is a group (has clusterOf members).
 */
export function isGroup(node: GraphNode): boolean {
    return (node.clusterOf?.length ?? 0) > 0;
}

/**
 * Get all group node IDs from the model.
 */
export function getGroupIds(model: GraphViewData): readonly string[] {
    return model.nodes.filter(isGroup).map((node) => node.id);
}