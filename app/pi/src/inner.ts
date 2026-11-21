export type InnerLayout = 'grid' | 'row' | 'column' | 'radial' | 'lane';

/** A short line from the focused node (card center) to an inner chip, in card-local percent. */
export interface InnerConnector {
    readonly chipId: string;
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
}

interface InnerSourceNode {
    readonly id: string;
    readonly label: string;
    readonly kind: string;
    readonly status?: string;
    readonly data?: Readonly<Record<string, unknown>>;
}

interface InnerSourceEdge {
    readonly source: string;
    readonly target: string;
    readonly kind?: string;
}

export interface InnerChip extends InnerSourceNode {
    readonly role: string;
    readonly scope?: string;
    readonly children: readonly InnerChip[];
}

export interface InnerPlacement {
    readonly chip: InnerChip;
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
}

const neighbourIDs = (
    focus: string,
    edges: readonly InnerSourceEdge[],
    exclude: ReadonlySet<string>,
    byID: ReadonlyMap<string, InnerSourceNode>,
): readonly string[] => {
    const contained: string[] = [];
    const related: string[] = [];
    for (const edge of edges) {
        const other = edge.source === focus ? edge.target : edge.target === focus ? edge.source : undefined;
        if (!other || other === focus || exclude.has(other) || !byID.has(other)) continue;
        const bucket = edge.kind === 'contains' || edge.kind === 'delegates' ? contained : related;
        if (!bucket.includes(other)) bucket.push(other);
    }
    return [...contained, ...related];
};

const chipOf = (
    node: InnerSourceNode,
    byID: ReadonlyMap<string, InnerSourceNode>,
    edges: readonly InnerSourceEdge[],
    depth: number,
    limit: number,
    seen: ReadonlySet<string>,
): InnerChip => ({
    id: node.id,
    label: node.label,
    kind: node.kind,
    status: node.status,
    data: node.data,
    role: typeof node.data?.role === 'string' ? node.data.role : node.kind,
    scope: typeof node.data?.scope === 'string' ? node.data.scope : undefined,
    children:
        depth <= 0
            ? []
            : neighbourIDs(node.id, edges, seen, byID)
                  .slice(0, limit)
                  .map((id) =>
                      chipOf(byID.get(id)!, byID, edges, depth - 1, Math.min(limit, 2), new Set([...seen, id])),
                  ),
});

/** A bounded neighborhood tree; focusing a chip rebuilds it, so recursion is navigation, not infinite DOM. */
export const innerTree = (
    focus: string,
    nodes: readonly InnerSourceNode[],
    edges: readonly InnerSourceEdge[],
    depth: number,
    limit = 6,
): readonly InnerChip[] => {
    if (depth <= 0 || !focus) return [];
    const byID = new Map(nodes.map((node) => [node.id, node]));
    return neighbourIDs(focus, edges, new Set([focus]), byID)
        .slice(0, limit)
        .map((id) => chipOf(byID.get(id)!, byID, edges, depth - 1, Math.min(limit, 2), new Set([focus, id])));
};

const graphPlacement = (
    chips: readonly InnerChip[],
    layout: 'radial' | 'lane',
): readonly InnerPlacement[] => {
    const count = chips.length;
    const width = layout === 'radial' ? 30 : 42;
    const height = layout === 'radial' ? 20 : 100 / count - 8;
    return chips.map((chip, index) => {
        if (layout === 'lane')
            return {
                chip,
                left: 50 + (index % 2) * 4,
                top: 4 + index * (height + 4),
                width,
                height,
            };
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
        return {
            chip,
            left: 50 + Math.cos(angle) * 32 - width / 2,
            top: 50 + Math.sin(angle) * 38 - height / 2,
            width,
            height,
        };
    });
};

/** Card-local percentage boxes; the whole card scales with the camera, so no DOM measurement is needed. */
export const innerPlacements = (
    chips: readonly InnerChip[],
    layout: InnerLayout,
): readonly InnerPlacement[] => {
    const count = chips.length;
    if (!count) return [];
    if (layout === 'radial' || layout === 'lane') return graphPlacement(chips, layout);
    const columns = layout === 'column' ? 1 : layout === 'row' ? count : Math.min(2, count);
    const rows = Math.ceil(count / columns);
    const gap = 3;
    const pad = 4;
    const width = (100 - pad * 2 - gap * (columns - 1)) / columns;
    const height = (100 - pad * 2 - gap * (rows - 1)) / rows;
    return chips.map((chip, index) => ({
        chip,
        left: pad + (index % columns) * (width + gap),
        top: pad + Math.floor(index / columns) * (height + gap),
        width,
        height,
    }));
};

/** Short spokes from the focused node to each chip; at most six, bounded by the same cap as the tree. */
export const innerConnectors = (placements: readonly InnerPlacement[]): readonly InnerConnector[] =>
    placements.map(({ chip, left, top, width, height }) => ({
        chipId: chip.id,
        x1: 50,
        y1: 50,
        x2: left + width / 2,
        y2: top + height / 2,
    }));
