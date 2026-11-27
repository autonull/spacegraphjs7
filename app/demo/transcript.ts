// A host that reads like a console and navigates like a graph. Transcript rows and graph cards are
// two projections of one local fixture; selecting either side drives the other. No provider, no
// network: the prompt loop appends deterministic local events.
import { escapeHtml } from '@spacegraphjs/renderer';
import { SpaceGraph, type EdgeSpec, type GraphSpec, type NodeSpec } from 'spacegraphjs';
import { transcriptLane } from 'spacegraphjs/layout';
import {
    mountTerminal,
    type TerminalController,
    type TerminalGraph,
    type TerminalLine,
} from 'spacegraphjs/terminal';
import { isEditableTarget, requireElement } from 'spacegraphjs/utils';
export type EventKind = 'user' | 'assistant' | 'file' | 'tool' | 'approval' | 'error' | 'artifact';
export type EventStatus = 'complete' | 'pending' | 'failed';
export type Filter = 'all' | 'error' | 'approval';
const VIEWS = ['graph', 'hybrid', 'transcript'] as const;
export type View = (typeof VIEWS)[number];
export interface TranscriptEvent {
    readonly id: string;
    readonly kind: EventKind;
    readonly label: string;
    readonly text: string;
    readonly status: EventStatus;
    readonly turn: number;
    /** Spine events are the transcript; branch events form subgraphs attached to a spine event. */
    readonly spine: boolean;
    readonly parent?: string;
    /** 0 is the primary transcript card; -1 and -2 are context at half and quarter scale. */
    readonly octave: number;
    readonly position: readonly [number, number, number];
}
const SPINE_STEP = 46;
const GUTTER = 18;
const CONTEXT_STEP = 22;
const CHAR_WIDTH = [8.2, 6.2, 4.9] as const;
const WIDTH_PADDING = [54, 30, 22] as const;
const MIN_WIDTH = [180, 88, 58] as const;
const MAX_WIDTH = [520, 200, 130] as const;
const LINE_HEIGHT = [16, 12, 10] as const;
const ROW_HEIGHT = [24, 14, 11] as const;
const STATUS_GLYPH: Record<EventStatus, string> = {
    complete: '✓',
    pending: '…',
    failed: '×',
};
const GLYPH: Record<EventKind, string> = {
    user: '@',
    assistant: '✦',
    file: '▤',
    tool: '⚙',
    approval: '!',
    error: '×',
    artifact: '◇',
};
const event = (
    id: string,
    kind: EventKind,
    label: string,
    text: string,
    status: EventStatus = 'complete',
    turn = 1,
    parent?: string,
): Omit<TranscriptEvent, 'position'> => ({
    id,
    kind,
    label,
    text,
    status,
    turn,
    spine: parent === undefined,
    parent,
    octave: 0,
});
type EventSeed = Omit<TranscriptEvent, 'position'>;
/** Append-only spine with each attached cluster solved at halving world scales. */
export function layoutEvents(items: readonly EventSeed[]): TranscriptEvent[] {
    const parentOf = new Map(
        items.filter((item) => item.parent).map((item) => [item.id, item.parent!]),
    );
    const octaveOf = (item: EventSeed): number => {
        const seen = new Set([item.id]);
        let parent = parentOf.get(item.id);
        let depth = 0;
        while (parent && !seen.has(parent)) {
            seen.add(parent);
            depth++;
            parent = parentOf.get(parent);
        }
        return -depth;
    };
    const sized = new Map(
        items.map((item) => {
            const octave = octaveOf(item);
            return [item.id, { octave, size: cardSize({ ...item, octave }) }] as const;
        }),
    );
    const solved = transcriptLane(
        items.map((item) => {
            const [width, height] = sized.get(item.id)!.size;
            return { id: item.id, parent: item.parent, width, height };
        }),
        { gutter: GUTTER, spineStep: SPINE_STEP, contextStep: CONTEXT_STEP },
    );
    return items.map((item) => {
        const point = solved.positions.get(item.id)!;
        return {
            ...item,
            octave: sized.get(item.id)!.octave,
            position: [point.x, point.y, point.z] as const,
        };
    });
}
const FIXTURE = layoutEvents([
    event('u1', 'user', 'user message', 'Summarise the repo'),
    event('f1', 'file', 'README.md', 'read · 42 lines', 'complete', 1, 'u1'),
    event('a1', 'assistant', 'assistant', 'The repo is a graph library.'),
    event('u2', 'user', 'user message', 'Add approval for patches', 'complete', 2),
    event('f2', 'file', 'auth.ts', 'read · 18 lines', 'complete', 2, 'u2'),
    event('p1', 'artifact', 'patch.diff', 'artifact · 4 files', 'complete', 2, 'u2'),
    event('d1', 'file', 'totals.ts', 'source · 12 lines', 'complete', 2, 'p1'),
    event('ap1', 'approval', 'Approve patch', 'sleeping · awaits signal', 'pending', 2),
    event('u3', 'user', 'user message', 'Run the suite', 'complete', 3),
    event('e1', 'error', 'test failed', '1 failure · vitest', 'failed'),
    event('f3', 'file', 'incident.md', 'read · 26 lines', 'complete', 3, 'e1'),
    event('q1', 'artifact', 'coverage.json', 'artifact · 18 KB', 'complete', 3, 'f3'),
    event('t1', 'tool', 'edit', 'action · complete', 'complete', 3, 'e1'),
    event('d2', 'file', 'round.test.ts', 'source · 9 lines', 'complete', 3, 't1'),
    event('a2', 'assistant', 'assistant', 'Fix proposed — awaiting approval', 'complete', 3),
]);
export function matchesFilter(item: TranscriptEvent, filter: Filter): boolean {
    return filter === 'all' || item.kind === filter;
}
type LineSource = Pick<TranscriptEvent, 'kind' | 'label' | 'text' | 'octave'>;
function lineOf(item: LineSource): string {
    return `${item.kind === 'user' ? 'user message' : item.label}: ${item.text}`;
}
function displayLine(item: LineSource): string {
    return item.octave === 0 ? lineOf(item) : item.label;
}
function octaveIndex(item: LineSource): number {
    return Math.min(2, Math.max(0, -item.octave));
}
export function cardHtml(item: TranscriptEvent): string {
    const meta =
        item.octave === 0 ? `<span class="zcard-meta">${STATUS_GLYPH[item.status]}</span>` : '';
    return [
        `<div class="zcard" data-kind="${item.kind}" data-status="${item.status}" data-octave="${item.octave}">`,
        '<span class="zcard-prompt">›</span>',
        `<span class="zcard-line">${escapeHtml(displayLine(item))}</span>`,
        meta,
        '</div>',
    ].join('');
}
/** Console-like sizing: the line sets the width and wraps into rows instead of clipping. */
export function cardSize(item: LineSource): readonly [number, number] {
    const index = octaveIndex(item);
    const line = displayLine(item);
    const width = Math.min(
        MAX_WIDTH[index],
        Math.max(MIN_WIDTH[index], line.length * CHAR_WIDTH[index] + WIDTH_PADDING[index]),
    );
    const charsPerLine = Math.max(
        8,
        Math.floor((width - WIDTH_PADDING[index]) / CHAR_WIDTH[index]),
    );
    const lines = Math.max(1, Math.ceil(line.length / charsPerLine));
    return [width, Math.max(ROW_HEIGHT[index], lines * LINE_HEIGHT[index] + 8)];
}
export function nodeFor(item: TranscriptEvent): NodeSpec {
    const [width, height] = cardSize(item);
    return {
        id: item.id,
        type: 'HtmlNode',
        label: item.label,
        position: [...item.position],
        data: {
            html: cardHtml(item),
            useRawHtml: true,
            showControls: false,
            pointerEvents: 'auto',
            width,
            height,
            minWidth: 32,
            minHeight: 6,
        },
    };
}
export function edgeFor(
    source: string,
    target: string,
    id = `${source}->${target}`,
    octave = 0,
): EdgeSpec {
    return {
        id,
        source,
        target,
        type: octave === 0 ? 'CurvedEdge' : octave === -1 ? 'DottedEdge' : 'Edge',
        data:
            octave === 0
                ? { color: 0x475569, opacity: 0.1, thickness: 1 }
                : { color: octave === -1 ? 0x475569 : 0x334155, thickness: 1 },
    };
}
export function buildSpec(items: readonly TranscriptEvent[] = FIXTURE): GraphSpec {
    const spine = items.filter((item) => item.spine);
    return {
        nodes: items.map(nodeFor),
        edges: [
            ...spine.slice(1).map((item, index) => edgeFor(spine[index]!.id, item.id)),
            ...items
                .filter((item) => item.parent)
                .map((item) =>
                    edgeFor(item.parent!, item.id, `${item.parent}->${item.id}`, item.octave),
                ),
        ],
    };
}
export async function boot(): Promise<void> {
    const root = document.documentElement;
    const canvas = requireElement<HTMLElement>('canvas');
    const rows = requireElement<HTMLElement>('rows');
    const announcer = requireElement<HTMLElement>('announcer');
    const params = new URLSearchParams(location.hash.slice(1));
    const graph = await SpaceGraph.create(canvas, buildSpec(FIXTURE), {
        chrome: false,
        plugins: [],
        keyboard: false,
        render: { projection: 'orthographic', depth: 'flat', transparent: true },
    });
    let items: TranscriptEvent[] = [...FIXTURE];
    let filter: Filter = 'all';
    let selected = '';
    let serial = 0;
    const terminalGraph: TerminalGraph = {
        addNode: (spec) => graph.addNode(spec),
        addEdge: (spec) => graph.addEdge(spec),
        removeNode: (id) => graph.removeNode(id),
        removeEdge: (id) => graph.removeEdge(id),
        setPositions: (positions) => graph.setPositions(positions),
        show: (id, visible) => graph.show(id, visible),
        select: (target) => graph.select(target),
        onNodeClick: (callback) =>
            graph.watch('node:click', (payload) =>
                callback('id' in payload ? payload.id : payload.node.id),
            ),
        onZoomBand: (callback) => graph.watch('zoomband:change', ({ band }) => callback(band)),
    };
    const terminalLineOf = (item: TranscriptEvent): TerminalLine => ({
        id: item.id,
        kind: item.kind,
        status: item.status,
        label: item.label,
        text: item.text,
        turn: item.turn,
        parent: item.parent,
        octave: item.octave,
    });
    let terminal: TerminalController;
    const expanded = new Set<string>();
    const visibleIds = (): string[] =>
        items.filter((item) => matchesFilter(item, filter)).map((item) => item.id);
    const frame = (): void => {
        const ids = visibleIds();
        if (ids.length) graph.frame(ids, { padding: 48, duration: 0.35, minScale: 0.55 });
    };
    const detailFor = (item: TranscriptEvent, visible: readonly TranscriptEvent[]): HTMLElement => {
        const panel = document.createElement('div');
        panel.className = 'row-detail';
        const body = document.createElement('p');
        body.className = 'row-detail-body';
        body.textContent = item.text;
        const info = document.createElement('p');
        const children = items.filter((candidate) => candidate.parent === item.id);
        info.textContent = [
            `${item.kind} · ${item.status} · turn ${item.turn}`,
            item.parent ? `parent: ${item.parent}` : 'spine line',
            children.length ? `attached: ${children.map((child) => child.id).join(', ')}` : '',
        ]
            .filter(Boolean)
            .join(' · ');
        const actions = document.createElement('div');
        actions.className = 'row-actions';
        const action = (label: string, name: string, target = item.id): void => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = label;
            button.dataset.detailAction = name;
            button.dataset.detailNode = target;
            actions.append(button);
        };
        action('Center', 'center');
        const index = visible.findIndex((candidate) => candidate.id === item.id);
        if (visible[index + 1]) action('Next', 'next', visible[index + 1]!.id);
        if (item.parent) action('Parent', 'parent', item.parent);
        if (children.length) action('Children', 'children');
        action('Collapse', 'collapse');
        panel.append(body, info, actions);
        return panel;
    };
    const rowFor = (item: TranscriptEvent, visible: readonly TranscriptEvent[]): HTMLElement => {
        const wrap = document.createElement('div');
        wrap.className = 'row-wrap';
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'row';
        row.dataset.node = item.id;
        row.dataset.kind = item.kind;
        row.dataset.status = item.status;
        row.dataset.octave = String(item.octave);
        row.title = `${item.label}: ${item.text}`;
        row.setAttribute('aria-current', String(item.id === selected));
        row.setAttribute('aria-expanded', String(expanded.has(item.id)));
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.textContent = GLYPH[item.kind];
        const body = document.createElement('span');
        const head = document.createElement('span');
        head.className = 'row-head';
        const title = document.createElement('span');
        title.className = 'row-title';
        title.textContent = `${item.octave === 0 ? '' : '↳ '}${item.kind === 'user' ? 'user message' : item.label}: ${item.text}`;
        const kind = document.createElement('span');
        kind.className = 'row-kind';
        kind.textContent = item.status;
        head.append(title, kind);
        const detail = document.createElement('span');
        detail.className = 'row-text';
        detail.textContent = `turn ${item.turn} · ${item.kind} · ${item.octave ? `${2 ** item.octave}×` : 'spine'}`;
        body.append(head, detail);
        row.append(dot, body);
        wrap.append(row);
        if (expanded.has(item.id)) wrap.append(detailFor(item, visible));
        return wrap;
    };
    const renderRows = (): void => {
        const focused = document.activeElement as HTMLElement | null;
        const focusID = focused?.closest<HTMLElement>('[data-node]')?.dataset.node;
        const focusAction = focused?.closest<HTMLElement>('[data-detail-action]');
        const focusKey = focusAction?.dataset.detailAction;
        const visible = items.filter((item) => matchesFilter(item, filter));
        rows.replaceChildren(...visible.map((item) => rowFor(item, visible)));
        requireElement('row-count').textContent = String(visible.length);
        const errors = items.filter((item) => item.kind === 'error').length;
        const pending = items.filter((item) => item.status === 'pending').length;
        requireElement('summary').textContent =
            `${items.length} events · ${errors} failure · ${pending} awaiting approval`;
        requireElement('attention').textContent = errors
            ? `${errors} failure · ${pending} pending`
            : '';
        requireElement('stat-nodes').textContent = String(items.length);
        const links =
            Math.max(0, items.filter((item) => item.spine).length - 1) +
            items.filter((item) => item.parent).length;
        requireElement('stat-edges').textContent = String(links);
        const row = focusID ? rows.querySelector<HTMLElement>(`[data-node="${focusID}"]`) : null;
        const action =
            focusKey && row
                ? row.parentElement?.querySelector<HTMLElement>(
                      `[data-detail-action="${focusKey}"]`,
                  )
                : null;
        (action ?? row)?.focus({ preventScroll: true });
    };
    const reveal = (id: string, focusRow = false): void => {
        const item = items.find((candidate) => candidate.id === id);
        if (!item) return;
        selected = id;
        terminal.focusLine(id);
        canvas.querySelectorAll<HTMLElement>('[data-node-id]').forEach((node) => {
            node.querySelector('.zcard')?.setAttribute(
                'data-selected',
                String(node.dataset.nodeId === id),
            );
        });
        renderRows();
        const row = rows.querySelector<HTMLElement>(`[data-node="${id}"]`);
        if (focusRow) row?.focus({ preventScroll: true });
        row?.scrollIntoView({ block: 'nearest' });
        announcer.textContent = `${item.kind}: ${item.label} — ${item.text}`;
    };
    terminal = mountTerminal(terminalGraph, {
        project: ({ visible }) => {
            const seeds = visible.map((entry) => ({
                id: entry.id,
                kind: entry.kind as EventKind,
                label: entry.label,
                text: entry.text,
                status: entry.status as EventStatus,
                turn: entry.turn ?? 1,
                parent: entry.parent,
                spine: entry.parent === undefined,
                octave: 0,
            }));
            return buildSpec(layoutEvents(seeds));
        },
        filter: (entry) => {
            const item = items.find((candidate) => candidate.id === entry.id);
            return item ? matchesFilter(item, filter) : false;
        },
        onReveal: (id) => reveal(id),
        onFocus: (id) => {
            if (root.dataset.view !== 'transcript') graph.inspect(id, { duration: 0.35 });
        },
        onCamera: ({ band }) => {
            requireElement('stat-band').textContent = band;
        },
        announce: (message) => {
            announcer.textContent = message;
        },
    });
    const toggleExpanded = (id: string): void => {
        if (expanded.has(id)) expanded.delete(id);
        else expanded.add(id);
        renderRows();
        announcer.textContent = `${expanded.has(id) ? 'Expanded' : 'Collapsed'} ${id}`;
    };
    const runDetailAction = (name: string, id: string): void => {
        const item = items.find((candidate) => candidate.id === id);
        if (!item) return;
        switch (name) {
            case 'center':
                reveal(id, true);
                break;
            case 'next':
            case 'parent': {
                const visible = visibleIds();
                const target = name === 'parent' ? item.parent : visible[visible.indexOf(id) + 1];
                if (target) {
                    expanded.add(target);
                    reveal(target, true);
                }
                break;
            }
            case 'children': {
                const children = items.filter((candidate) => candidate.parent === id);
                for (const child of children) expanded.add(child.id);
                if (children[0]) reveal(children[0].id, true);
                break;
            }
            case 'collapse':
                expanded.delete(id);
                renderRows();
                break;
        }
    };
    const append = (candidate: Omit<TranscriptEvent, 'position'>): void => {
        items = layoutEvents([...items, candidate]);
        terminal.append([terminalLineOf(items.at(-1)!)]);
        renderRows();
        graph.render();
    };
    const submit = (text: string): void => {
        const prompt = text.trim();
        if (!prompt) return;
        const id = `local-${++serial}`;
        const turn = Math.max(...items.map((item) => item.turn)) + 1;
        append(event(id, 'user', 'user message', prompt, 'complete', turn));
        reveal(id);
        announcer.textContent = `Sent: ${prompt}. Local demo — no provider.`;
        window.setTimeout(() => {
            append(
                event(
                    `${id}-reply`,
                    'assistant',
                    'assistant',
                    'Local reply — no model provider in this demo.',
                    'complete',
                    turn,
                ),
            );
            reveal(`${id}-reply`);
        }, 420);
    };
    const setView = (view: View): void => {
        root.dataset.view = view;
        document.querySelectorAll<HTMLButtonElement>('[data-view-value]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.viewValue === view));
        });
        requestAnimationFrame(() => {
            if (view !== 'transcript') frame();
            else rows.scrollTop = 0;
            announcer.textContent = `${view} surface`;
        });
    };
    const setFilter = (next: Filter): void => {
        filter = next;
        document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.filter === next));
        });
        terminal.refresh();
        renderRows();
        frame();
        announcer.textContent = `${next} filter · ${visibleIds().length} events`;
    };
    const setTheme = (theme: string): void => {
        root.dataset.theme = theme;
        requireElement<HTMLSelectElement>('theme').value = theme;
        history.replaceState(null, '', `#theme=${theme}`);
    };
    rows.addEventListener('click', (mouse) => {
        const target = mouse.target as HTMLElement;
        const button = target.closest<HTMLElement>('[data-detail-action]');
        if (button?.dataset.detailAction) {
            runDetailAction(button.dataset.detailAction, button.dataset.detailNode ?? '');
            return;
        }
        const row = target.closest<HTMLElement>('[data-node]');
        const id = row?.dataset.node;
        if (!id) return;
        if (expanded.has(id)) expanded.delete(id);
        else expanded.add(id);
        reveal(id, true);
    });
    rows.addEventListener('keydown', (key) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key.key)) return;
        const row = (key.target as HTMLElement).closest<HTMLElement>('[data-node]');
        if (!row) return;
        const ids = visibleIds();
        const index = ids.indexOf(row.dataset.node!);
        const next =
            key.key === 'Home'
                ? 0
                : key.key === 'End'
                  ? ids.length - 1
                  : Math.min(
                        ids.length - 1,
                        Math.max(0, index + (key.key === 'ArrowDown' ? 1 : -1)),
                    );
        const id = ids[next];
        if (!id) return;
        key.preventDefault();
        reveal(id, true);
    });
    requireElement<HTMLFormElement>('prompt-form').addEventListener('submit', (submitEvent) => {
        submitEvent.preventDefault();
        const input = requireElement<HTMLInputElement>('prompt-input');
        submit(input.value);
        input.value = '';
    });
    requireElement('chips').addEventListener('click', (mouse) => {
        const chip = (mouse.target as HTMLElement).closest<HTMLElement>('[data-prompt]');
        if (chip?.dataset.prompt) submit(chip.dataset.prompt);
    });
    document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => {
        button.addEventListener('click', () => setFilter(button.dataset.filter as Filter));
    });
    document.querySelectorAll<HTMLButtonElement>('[data-view-value]').forEach((button) => {
        button.addEventListener('click', () => setView(button.dataset.viewValue as View));
    });
    requireElement<HTMLSelectElement>('theme').addEventListener('change', (change) => {
        setTheme((change.target as HTMLSelectElement).value);
    });
    requireElement('fit').addEventListener('click', frame);
    requireElement('reset').addEventListener('click', () => {
        setFilter('all');
        rows.scrollTop = 0;
        reveal(items[0]!.id);
    });
    document.addEventListener('keydown', (key) => {
        const target = key.target as HTMLElement;
        const editable = isEditableTarget(target);
        const view = ['1', '2', '3'].indexOf(key.key);
        if (view >= 0 && !editable) setView(VIEWS[view]!);
        if (key.key === '/' && !editable) {
            key.preventDefault();
            requireElement<HTMLInputElement>('prompt-input').focus();
        }
        if (key.key === 'Escape' && editable) target.blur();
    });
    setTheme(params.get('theme') ?? 'dark');
    renderRows();
    graph.render();
    frame();
    Object.assign(window, {
        __transcript: {
            events: () => items.map((item) => item.id),
            focus: reveal,
            filter: setFilter,
            view: setView,
            submit,
            zoom: (value: number) => graph.setZoom(value),
            toggle: toggleExpanded,
            expanded: () => [...expanded],
            selected: () => selected,
            frame,
        },
    });
}
if (typeof document !== 'undefined' && document.getElementById('canvas')) {
    void boot();
}
