export interface InnerWidgetItem {
    readonly id: string;
    readonly label: string;
    readonly kind: string;
    readonly detail: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

export interface InnerWidgetModel {
    readonly container: string;
    readonly items: readonly InnerWidgetItem[];
}

export interface InnerWidgetState {
    readonly folded: boolean;
    readonly detached: readonly string[];
}

export type InnerWidgetAction =
    | { readonly type: 'fold' }
    | { readonly type: 'unfold' }
    | { readonly type: 'toggle' }
    | { readonly type: 'detach'; readonly id: string }
    | { readonly type: 'reattach'; readonly id: string };

export const reduceInnerWidgets = (
    state: InnerWidgetState,
    action: InnerWidgetAction,
): InnerWidgetState => {
    switch (action.type) {
        case 'fold':
            return state.folded ? state : { ...state, folded: true };
        case 'unfold':
            return state.folded ? { ...state, folded: false } : state;
        case 'toggle':
            return { ...state, folded: !state.folded };
        case 'detach':
            return state.detached.includes(action.id)
                ? state
                : { ...state, detached: [...state.detached, action.id] };
        case 'reattach': {
            const detached = state.detached.filter((id) => id !== action.id);
            return detached.length === state.detached.length ? state : { ...state, detached };
        }
    }
};

export const innerWidgetNodeID = (container: string, id: string) => `inner:${container}:${id}`;

export const innerWidgetEdgeID = (container: string, id: string) =>
    `contains:${container}:${innerWidgetNodeID(container, id)}`;

export interface InnerWidgetEdge {
    readonly id: string;
    readonly source: string;
    readonly target: string;
    readonly kind: 'contains';
}

/** Detached widgets are committed facts in hosts; the edge is derived from that same id pair. */
export const innerWidgetEdges = (
    model: InnerWidgetModel,
    state: InnerWidgetState,
): readonly InnerWidgetEdge[] =>
    state.detached.map((id) => ({
        id: innerWidgetEdgeID(model.container, id),
        source: model.container,
        target: innerWidgetNodeID(model.container, id),
        kind: 'contains' as const,
    }));

export interface InnerWidgetStats {
    readonly total: number;
    readonly shown: number;
    readonly detached: number;
    readonly folded: boolean;
}

export const innerWidgetStats = (
    model: InnerWidgetModel,
    state: InnerWidgetState,
): InnerWidgetStats => {
    const detached = new Set(state.detached);
    return {
        total: model.items.length,
        shown: model.items.filter((item) => !detached.has(item.id)).length,
        detached: state.detached.length,
        folded: state.folded,
    };
};

export interface FoldPoint {
    readonly x: number;
    readonly y: number;
}

export const foldPosition = (from: FoldPoint, to: FoldPoint, t: number): FoldPoint => {
    const k = Math.max(0, Math.min(1, t));
    return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
};

/** Fold is a view transform: ids and placements are interpolated, never rewritten as facts. */
export const foldPlacement = (
    item: InnerWidgetItem,
    folded: boolean,
    t: number,
): InnerWidgetItem => {
    const k = Math.max(0, Math.min(1, t));
    const height = folded ? 0 : item.height;
    return {
        ...item,
        y: item.y + ((item.height - height) / 2) * k,
        height: item.height + (height - item.height) * k,
    };
};

const esc = (value: string) =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');

const innerAction = (action: string, label: string) =>
    `<button type="button" data-sg-interactive="true" data-inner-action="${esc(action)}">${esc(label)}</button>`;

export interface InnerWidgetProps {
    readonly model: InnerWidgetModel;
    readonly state: InnerWidgetState;
    readonly stats: InnerWidgetStats;
}

export const innerWidgetHTML = ({ model, state, stats }: InnerWidgetProps): string => {
    const detached = new Set(state.detached);
    const cards = model.items
        .map((item) => {
            const isDetached = detached.has(item.id);
            const action = isDetached ? 'reattach' : 'detach';
            return `<div class="inner-widget" data-inner-item="${esc(item.id)}" data-kind="${esc(item.kind)}" data-detached="${isDetached}" style="left:${item.x}%;top:${item.y}%;width:${item.width}%;height:${item.height}%">
                <b>${esc(item.label)}</b><span>${esc(item.detail)}</span>
                ${innerAction(`${action}:${item.id}`, isDetached ? 'REATTACH' : 'DETACH')}
            </div>`;
        })
        .join('');
    return `<div class="inner-widgets" data-inner-container="${esc(model.container)}" data-folded="${state.folded}">
        <div class="inner-controls">${innerAction(state.folded ? 'unfold' : 'fold', state.folded ? 'UNFOLD' : 'FOLD')}
            <span>${stats.shown}/${stats.total} inner · ${stats.detached} detached</span>
        </div>
        <div class="inner-grid">${cards}</div>
    </div>`;
};

export interface FoldableNodeProps extends InnerWidgetProps {
    readonly label: string;
}

export const foldableNodeHTML = ({ label, ...props }: FoldableNodeProps): string =>
    `<div class="foldable-node" data-foldable="${esc(props.model.container)}" data-folded="${props.state.folded}">
        <div class="foldable-head">${esc(label)} · ${props.stats.shown}/${props.stats.total} inner</div>
        ${innerWidgetHTML(props)}
    </div>`;
