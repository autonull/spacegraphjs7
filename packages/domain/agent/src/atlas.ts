export interface AtlasEvent {
    readonly id: string;
    readonly kind: string;
    readonly status: string;
    readonly role: string;
    readonly text: string;
    readonly turn: number;
    readonly at: number;
    readonly label: string;
    readonly parent?: string;
}

export interface AtlasChapter {
    readonly id: string;
    readonly label: string;
    readonly turn: number;
    readonly ids: readonly string[];
}

export interface AtlasEdge {
    readonly id: string;
    readonly source: string;
    readonly target: string;
    readonly kind: 'causal' | 'failed';
}

export interface AtlasModel {
    readonly events: readonly AtlasEvent[];
    readonly chapters: readonly AtlasChapter[];
    readonly edges: readonly AtlasEdge[];
}

export interface AtlasStats {
    readonly shown: number;
    readonly total: number;
    readonly chapters: number;
    readonly failed: number;
}

export interface AtlasPoint {
    readonly x: number;
    readonly y: number;
}

export interface AtlasState {
    readonly total: number;
    readonly prefix: number;
    readonly playing: boolean;
    readonly selected?: string;
    readonly window?: string;
    readonly travel?: { readonly from: string; readonly to: string };
}

export type AtlasAction =
    | { readonly type: 'prefix'; readonly value: number }
    | { readonly type: 'play' }
    | { readonly type: 'stop' }
    | { readonly type: 'select'; readonly id: string }
    | { readonly type: 'window'; readonly id: string }
    | { readonly type: 'close' }
    | { readonly type: 'travel'; readonly from: string; readonly to: string }
    | { readonly type: 'arrive' };

const clampPrefix = (value: number, total: number) =>
    Math.max(1, Math.min(total, Math.round(value)));

export const reduceAtlas = (state: AtlasState, action: AtlasAction): AtlasState => {
    switch (action.type) {
        case 'prefix': {
            const prefix = clampPrefix(action.value, state.total);
            return prefix === state.prefix ? state : { ...state, prefix };
        }
        case 'play':
            return state.playing && state.prefix === 1
                ? state
                : { ...state, playing: true, prefix: 1 };
        case 'stop':
            return state.prefix === state.total && !state.playing
                ? state
                : { ...state, prefix: state.total, playing: false };
        case 'select':
            return state.selected === action.id ? state : { ...state, selected: action.id };
        case 'window':
            return state.window === action.id
                ? state
                : { ...state, window: action.id, selected: action.id };
        case 'close':
            return state.window === undefined ? state : { ...state, window: undefined };
        case 'travel':
            return state.travel?.from === action.from && state.travel?.to === action.to
                ? state
                : { ...state, travel: { from: action.from, to: action.to } };
        case 'arrive':
            return state.travel === undefined ? state : { ...state, travel: undefined };
    }
};

export const atlasChapters = (events: readonly AtlasEvent[]): readonly AtlasChapter[] => {
    const groups = events.reduce<{ readonly turn: number; readonly ids: string[] }[]>(
        (all, event) => {
            const last = all.at(-1);
            if (last && last.turn === event.turn) last.ids.push(event.id);
            else all.push({ turn: event.turn, ids: [event.id] });
            return all;
        },
        [],
    );
    return groups.map((group, index) => ({
        id: `chapter-${index + 1}`,
        label: `Turn ${group.turn}`,
        turn: group.turn,
        ids: group.ids,
    }));
};

export const atlasEdges = (events: readonly AtlasEvent[]): readonly AtlasEdge[] =>
    events.flatMap((event) =>
        event.parent
            ? [
                  {
                      id: `edge-${event.id}`,
                      source: event.parent,
                      target: event.id,
                      kind: event.status === 'failed' ? ('failed' as const) : ('causal' as const),
                  },
              ]
            : [],
    );

export const atlasModel = (events: readonly AtlasEvent[]): AtlasModel => ({
    events,
    chapters: atlasChapters(events),
    edges: atlasEdges(events),
});

export const atlasVisible = (events: readonly AtlasEvent[], prefix: number) =>
    events.slice(0, Math.max(0, Math.min(events.length, prefix)));

export const atlasStats = (
    events: readonly AtlasEvent[],
    chapters: readonly AtlasChapter[],
    prefix: number,
): AtlasStats => {
    const shown = atlasVisible(events, prefix);
    return {
        shown: shown.length,
        total: events.length,
        chapters: chapters.length,
        failed: shown.filter((event) => event.status === 'failed').length,
    };
};

export const atlasTravel = (from: AtlasPoint, to: AtlasPoint, t: number): AtlasPoint => {
    const k = Math.max(0, Math.min(1, t));
    return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
};

const esc = (value: string) =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');

export interface ReplayScrubberProps {
    readonly prefix: number;
    readonly total: number;
    readonly playing: boolean;
}

export const replayScrubberHTML = ({ prefix, total, playing }: ReplayScrubberProps): string =>
    `<div class="atlas-scrubber" role="group" aria-label="Replay prefix">
        <button type="button" data-sg-interactive="true" data-atlas-action="play" data-on="${playing}">${playing ? 'PAUSE' : 'REPLAY'}</button>
        <button type="button" data-sg-interactive="true" data-atlas-action="stop">STOP</button>
        <input type="range" min="1" max="${Math.max(1, total)}" value="${prefix}" data-atlas-scrub aria-label="Replay prefix" data-sg-interactive="true" />
        <output data-atlas-step aria-live="polite">${prefix}/${total}</output>
    </div>`;

export interface SessionAtlasProps {
    readonly model: AtlasModel;
    readonly state: AtlasState;
    readonly stats: AtlasStats;
}

export const sessionAtlasHTML = ({ model, state, stats }: SessionAtlasProps): string => {
    const visible = new Set(atlasVisible(model.events, state.prefix).map((event) => event.id));
    const chapters = model.chapters
        .map(
            (chapter) =>
                `<button type="button" data-sg-interactive="true" data-atlas-chapter="${esc(chapter.id)}" data-on="${chapter.ids.every((id) => visible.has(id))}">${esc(chapter.label)} <span>${chapter.ids.length}</span></button>`,
        )
        .join('');
    const events = model.events
        .map(
            (
                event,
            ) => `<li class="atlas-event" data-atlas-event="${esc(event.id)}" data-visible="${visible.has(event.id)}" data-selected="${state.selected === event.id}" data-kind="${esc(event.kind)}" data-status="${esc(event.status)}">
            <span class="atlas-turn">T${event.turn}</span>
            <span class="atlas-text">${esc(event.label)}</span>
            <button type="button" data-sg-interactive="true" data-atlas-action="select:${esc(event.id)}">FOCUS</button>
            <button type="button" data-sg-interactive="true" data-atlas-action="window:${esc(event.id)}">WINDOW</button>
        </li>`,
        )
        .join('');
    const edges = model.edges
        .map(
            (edge) =>
                `<li data-atlas-edge="${esc(edge.id)}" data-kind="${esc(edge.kind)}" data-visible="${visible.has(edge.target)}">${esc(edge.source)} → ${esc(edge.target)} · ${esc(edge.kind)}<button type="button" data-sg-interactive="true" data-atlas-action="travel:${esc(edge.source)}|${esc(edge.target)}">TRAVEL</button></li>`,
        )
        .join('');
    const selected = model.events.find((event) => event.id === state.selected);
    const inspector = selected
        ? `<div class="atlas-inspector" data-atlas-inspector="${esc(selected.id)}"><b>${esc(selected.id)} · ${esc(selected.kind)}/${esc(selected.status)}</b><p>${esc(selected.text)}</p></div>`
        : '<div class="atlas-inspector">Select an event.</div>';
    const window = state.window
        ? `<div class="atlas-window" data-atlas-window="${esc(state.window)}"><b>${esc(state.window)}</b><button type="button" data-sg-interactive="true" data-atlas-action="close">CLOSE</button></div>`
        : '';
    return `<div class="atlas-panel" data-atlas="session">
        <div class="atlas-head">session · ${stats.shown}/${stats.total} committed · ${stats.chapters} chapters · ${stats.failed} failed</div>
        ${replayScrubberHTML({ prefix: state.prefix, total: state.total, playing: state.playing })}
        <div class="atlas-chapters" role="group" aria-label="Session chapters">${chapters}</div>
        <ul class="atlas-events">${events}</ul>
        <div class="atlas-edges"><b>causal edges</b><ul>${edges}</ul></div>
        ${inspector}${window}
    </div>`;
};
