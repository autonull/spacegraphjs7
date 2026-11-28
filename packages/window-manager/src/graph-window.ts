export type GraphWindowBand = 'dot' | 'glyph' | 'card' | 'detail';

export const WINDOW_BANDS: readonly GraphWindowBand[] = ['dot', 'glyph', 'card', 'detail'];

export interface GraphWindowProps {
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly tone?: string;
    readonly tabs: readonly string[];
    readonly activeTab: string;
    readonly focused: boolean;
    readonly band: GraphWindowBand;
    /** Escaped markup supplied by the host; the shell never interprets it. */
    readonly body: (tab: string) => string;
}

export interface WindowCard {
    readonly id: string;
    readonly title: string;
    readonly focused: boolean;
    readonly hidden: boolean;
}

export interface GraphWindowState {
    readonly tab: string;
    readonly focused: boolean;
    readonly hidden: boolean;
}

export type GraphWindowEvent =
    | { readonly type: 'tab'; readonly tab: string }
    | { readonly type: 'focus' }
    | { readonly type: 'hide' };

export const reduceGraphWindow = (
    state: GraphWindowState,
    event: GraphWindowEvent,
): GraphWindowState => {
    switch (event.type) {
        case 'tab':
            return state.tab === event.tab ? state : { ...state, tab: event.tab };
        case 'focus':
            return state.focused && !state.hidden
                ? state
                : { ...state, focused: true, hidden: false };
        case 'hide':
            return state.hidden ? state : { ...state, hidden: true, focused: false };
    }
};

const esc = (value: string) =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');

export const graphWindowAction = (action: string, windowID: string, label: string) =>
    `<button type="button" data-sg-interactive="true" data-gw-action="${esc(action)}" data-gw-window="${esc(windowID)}">${esc(label)}</button>`;

export const graphWindowHTML = (props: GraphWindowProps): string => {
    const tone = props.tone ? ` style="--gw-tone:${esc(props.tone)}"` : '';
    if (props.band === 'dot' || props.band === 'glyph')
        return `<div class="gw-compact" data-gw-window="${esc(props.id)}"${tone}><span class="gw-dot"></span>${esc(props.title)}</div>`;
    const tabs = props.tabs
        .map(
            (tab) =>
                `<button type="button" data-sg-interactive="true" data-gw-action="tab:${esc(tab)}" data-gw-window="${esc(props.id)}" data-on="${tab === props.activeTab}">${esc(tab.toUpperCase())}</button>`,
        )
        .join('');
    return `<div class="gw-window" data-gw-window="${esc(props.id)}" data-focused="${props.focused}"${tone}>
        <div class="gw-head"><span class="gw-dot"></span><span class="gw-name">${esc(props.title)}</span><span class="gw-status">${esc(props.status)}</span></div>
        <div class="gw-tabs">${tabs}</div>
        <div class="gw-body">${props.body(props.activeTab)}</div>
    </div>`;
};

export const graphWindowTaskbarHTML = (cards: readonly WindowCard[]): string =>
    cards
        .map(
            (card) =>
                `<button type="button" data-sg-interactive="true" data-gw-focus="${esc(card.id)}" data-active="${card.focused}" data-hidden="${card.hidden}">${esc(card.title)}</button>`,
        )
        .join('');
