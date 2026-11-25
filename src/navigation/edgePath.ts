/** A host-agnostic walk along recorded edges. No session vocabulary, camera or DOM. */
export type EdgePathStep = {
    readonly id: string;
    readonly via: string;
    readonly kind: string;
    /** True when the walk followed source → target. */
    readonly forward: boolean;
};

export type EdgePathOptions = {
    /** Edge kinds to follow; the host supplies its vocabulary. Defaults to every kind. */
    readonly kinds?: readonly string[];
    /** Follow source → target only. False traverses both directions. Defaults to true. */
    readonly directed?: boolean;
};

export type EdgePathModel = {
    readonly nodes: readonly { readonly id: string }[];
    readonly edges: readonly {
        readonly source: string;
        readonly target: string;
        readonly kind: string;
    }[];
};

/** Breadth-first walk from a committed node, visiting each reachable node once. */
export const edgePath = (
    model: EdgePathModel,
    startID: string,
    options: EdgePathOptions = {},
): readonly EdgePathStep[] => {
    const ids = new Set(model.nodes.map((node) => node.id));
    if (!ids.has(startID)) return [];
    const kinds = options.kinds ? new Set(options.kinds) : undefined;
    const directed = options.directed !== false;
    const seen = new Set([startID]);
    const queue = [startID];
    const steps: EdgePathStep[] = [];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const current = queue[cursor]!;
        for (const edge of model.edges) {
            if (kinds && !kinds.has(edge.kind)) continue;
            const next = edge.source === current
                ? { id: edge.target, forward: true }
                : !directed && edge.target === current
                    ? { id: edge.source, forward: false }
                    : undefined;
            if (!next || !ids.has(next.id) || seen.has(next.id)) continue;
            seen.add(next.id);
            steps.push({ id: next.id, via: current, kind: edge.kind, forward: next.forward });
            queue.push(next.id);
        }
    }
    return steps;
};
