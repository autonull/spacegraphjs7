export interface DensityPoint {
    readonly x: number;
    readonly y: number;
}

export interface DensityNode extends DensityPoint {
    readonly id: string;
    readonly label: string;
}

export interface DensityEdge {
    readonly source: string;
    readonly target: string;
    readonly kind?: string;
}

export interface DensityRect {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

export interface GatheredNode extends DensityPoint {
    readonly id: string;
    readonly weight: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Attention is geometry: the focus moves to the origin, neighbours ring it, others drift outward. */
export const gatherLayout = (
    nodes: readonly DensityNode[],
    edges: readonly DensityEdge[],
    focusID?: string,
): readonly GatheredNode[] => {
    const focus = nodes.find((node) => node.id === focusID);
    if (!focus) return nodes.map((node) => ({ id: node.id, x: node.x, y: node.y, weight: 0 }));
    const neighbours = new Set(
        edges.flatMap((edge) =>
            edge.source === focusID ? [edge.target] : edge.target === focusID ? [edge.source] : [],
        ),
    );
    const byID = new Map(nodes.map((node) => [node.id, node]));
    return nodes.map((node, index) => {
        if (node.id === focusID) return { id: node.id, x: 0, y: 0, weight: 1 };
        if (neighbours.has(node.id)) {
            const angle = (index / nodes.length) * Math.PI * 2;
            return {
                id: node.id,
                x: Math.cos(angle) * 190,
                y: Math.sin(angle) * 150,
                weight: 0.65,
            };
        }
        const base = byID.get(node.id) ?? node;
        const dx = base.x - focus.x;
        const dy = base.y - focus.y;
        const length = Math.hypot(dx, dy) || 1;
        const distance = length + 190;
        return {
            id: node.id,
            x: focus.x + (dx / length) * distance,
            y: focus.y + (dy / length) * distance,
            weight: 0,
        };
    });
};

export interface LensScope {
    readonly root: string;
    readonly ids: readonly string[];
    readonly edges: readonly DensityEdge[];
    readonly placements: readonly (DensityPoint & { readonly id: string })[];
}

/** A magnifier scopes a bounded neighbourhood; the second camera only arranges that scope. */
export const lensScope = (
    nodes: readonly DensityNode[],
    edges: readonly DensityEdge[],
    focusID: string,
    limit = 6,
): LensScope => {
    const children = edges
        .filter(
            (edge) => edge.kind === 'part-of' && edge.target === focusID && edge.source !== focusID,
        )
        .slice(0, Math.max(0, limit - 1))
        .map((edge) => edge.source);
    const ids = [focusID, ...children];
    const chosen = new Set(ids);
    const placements = ids.map((id, index) => {
        const angle = (index / Math.max(1, ids.length)) * Math.PI * 2;
        return { id, x: Math.cos(angle) * 96, y: Math.sin(angle) * 96 };
    });
    return {
        root: focusID,
        ids,
        edges: edges.filter((edge) => chosen.has(edge.source) && chosen.has(edge.target)),
        placements,
    };
};

export const lassoScope = (
    points: readonly (DensityPoint & { readonly id: string })[],
    rect: DensityRect,
): readonly string[] =>
    points
        .filter(
            (point) =>
                point.x >= rect.x &&
                point.x <= rect.x + rect.width &&
                point.y >= rect.y &&
                point.y <= rect.y + rect.height,
        )
        .map((point) => point.id);

export const lassoFrame = (
    nodes: readonly DensityNode[],
    ids: readonly string[],
): DensityRect | undefined => {
    const chosen = new Set(ids);
    const picked = nodes.filter((node) => chosen.has(node.id));
    if (!picked.length) return undefined;
    const xs = picked.map((node) => node.x);
    const ys = picked.map((node) => node.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        width: maxX - minX + 110,
        height: maxY - minY + 90,
    };
};

export const internalEdgeCount = (
    edges: readonly DensityEdge[],
    ids: readonly string[],
): number => {
    const chosen = new Set(ids);
    return edges.filter((edge) => chosen.has(edge.source) && chosen.has(edge.target)).length;
};

export interface MorphStop {
    readonly id: string;
    readonly at: number;
}

/** Layout is a step function of zoom; hosts interpolate between the two adjacent stops. */
export const morphTarget = (zoom: number, stops: readonly MorphStop[]): string => {
    if (!stops.length) return '';
    const ascending = [...stops].sort((a, b) => a.at - b.at);
    return ascending.reduce(
        (current, stop) => (zoom >= stop.at ? stop.id : current),
        ascending[0]!.id,
    );
};

export type DensityTool = 'off' | 'gather' | 'lens' | 'lasso' | 'morph';

export interface DensityState {
    readonly tool: DensityTool;
    readonly focus?: string;
    readonly pinned: boolean;
    readonly selection: readonly string[];
    readonly zoom: number;
    readonly layout: string;
}

export type DensityAction =
    | { readonly type: 'tool'; readonly tool: DensityTool }
    | { readonly type: 'focus'; readonly id?: string }
    | { readonly type: 'pin' }
    | { readonly type: 'release' }
    | { readonly type: 'scope'; readonly ids: readonly string[] }
    | { readonly type: 'zoom'; readonly value: number }
    | { readonly type: 'layout'; readonly id: string };

export const reduceDensity = (state: DensityState, action: DensityAction): DensityState => {
    switch (action.type) {
        case 'tool':
            return state.tool === action.tool ? state : { ...state, tool: action.tool };
        case 'focus':
            return state.focus === action.id ? state : { ...state, focus: action.id };
        case 'pin':
            return state.pinned ? state : { ...state, pinned: true };
        case 'release':
            return state.pinned ? { ...state, pinned: false, focus: undefined } : state;
        case 'scope':
            return state.selection.length === action.ids.length &&
                state.selection.every((id, index) => id === action.ids[index])
                ? state
                : { ...state, selection: [...action.ids] };
        case 'zoom': {
            const zoom = clamp(action.value, 0, 1);
            return zoom === state.zoom ? state : { ...state, zoom };
        }
        case 'layout':
            return state.layout === action.id ? state : { ...state, layout: action.id };
    }
};

const esc = (value: string) =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');

export interface DensityPanelProps {
    readonly state: DensityState;
    readonly gathered: number;
    readonly scoped: number;
    readonly internal: number;
    readonly tools?: readonly DensityTool[];
}

export const densityPanelHTML = ({
    state,
    gathered,
    scoped,
    internal,
    tools = ['gather', 'lens', 'lasso', 'morph', 'off'],
}: DensityPanelProps): string => {
    const buttons = tools
        .map(
            (tool) =>
                `<button type="button" data-sg-interactive="true" data-density-tool="${tool}" data-on="${state.tool === tool}">${esc(tool.toUpperCase())}</button>`,
        )
        .join('');
    return `<div class="density-panel" data-density-tool="${state.tool}">
        <div class="density-head">density · ${esc(state.tool)} · zoom ${state.zoom.toFixed(2)}</div>
        <div class="density-tools">${buttons}</div>
        <div class="density-detail">${state.focus ? `focus ${esc(state.focus)}` : 'no focus'} · ${gathered} gathered · ${scoped} scoped · ${internal} internal edges · ${esc(state.layout)}</div>
    </div>`;
};
