export type ScopeNode = {
    readonly id: string;
    readonly kind: string;
    readonly label?: string;
    readonly data?: Readonly<Record<string, unknown>>;
};

export type ScopeEdge = {
    readonly id: string;
    readonly source: string;
    readonly target: string;
    readonly kind: string;
};

export type Scope = {
    readonly id: string;
    readonly parent?: string;
    readonly depth: number;
    readonly nodeIDs: readonly string[];
    readonly position: readonly [number, number, number];
};

/** Deterministic tree scopes from containment edges; the host owns every coordinate. */
export const buildScopes = (
    nodes: readonly ScopeNode[],
    edges: readonly ScopeEdge[],
    spacing = 260,
): readonly Scope[] => {
    const ids = new Set(nodes.map((node) => node.id));
    const parentOf = new Map<string, string>();
    const childrenOf = new Map<string, string[]>();
    for (const edge of edges) {
        if (edge.kind !== 'contains') continue;
        if (!ids.has(edge.source) || !ids.has(edge.target)) continue;
        if (!parentOf.has(edge.target)) parentOf.set(edge.target, edge.source);
        const siblings = childrenOf.get(edge.source);
        if (siblings) siblings.push(edge.target);
        else childrenOf.set(edge.source, [edge.target]);
    }
    const roots = nodes.filter((node) => !parentOf.has(node.id)).map((node) => node.id);
    const scopes: Scope[] = [];
    const seen = new Set<string>();
    const visit = (id: string, parent: string | undefined, depth: number, slot: number): void => {
        if (seen.has(id)) return;
        seen.add(id);
        const children = (childrenOf.get(id) ?? []).filter((child) => !seen.has(child));
        scopes.push({
            id,
            parent,
            depth,
            nodeIDs: [id],
            position: [slot * spacing, -depth * 170, 0],
        });
        children.forEach((child, index) => visit(child, id, depth + 1, slot + index + 1));
    };
    let slot = 0;
    for (const root of roots) {
        visit(root, undefined, 0, slot);
        slot = scopes.length;
    }
    for (const node of nodes) if (!seen.has(node.id)) visit(node.id, undefined, 0, slot++);
    return scopes;
};
