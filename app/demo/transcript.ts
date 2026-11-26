// A host that reads like a console and navigates like a graph. Transcript rows and graph cards are
// two projections of one local fixture; selecting either side drives the other. No provider, no
// network: the prompt loop appends deterministic local events.
import { SpaceGraph, nodes, type EdgeSpec, type GraphSpec, type NodeSpec } from 'spacegraphjs';
import { octaveLayout } from 'spacegraphjs/layout';

export type EventKind = 'user' | 'assistant' | 'file' | 'tool' | 'approval' | 'error' | 'artifact';
export type EventStatus = 'complete' | 'pending' | 'failed';
export type Filter = 'all' | 'error' | 'approval';
export type View = 'graph' | 'hybrid' | 'transcript';

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

const SPINE_STEP = 26;
const GUTTER_X = 14;
const SATELLITE_STEP = 16;
const COLUMN_STEP = 76;
const CARD: readonly [number, number] = [120, 10];
const CHAR_WIDTH = [8.6, 6.2, 4.8] as const;
const MIN_WIDTH = [160, 72, 52] as const;
const MAX_WIDTH = [480, 180, 110] as const;
const STATUS_GLYPH: Record<EventStatus, string> = {
    complete: '✓',
    pending: '…',
    failed: '×',
};
const ROW_HEIGHT = [22, 12, 9] as const;

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
    const spine = items.filter((item) => item.spine);
    const parentOf = new Map(
        items.filter((item) => item.parent).map((item) => [item.id, item.parent!]),
    );
    const byID = new Map(items.map((item) => [item.id, item]));
    const result: TranscriptEvent[] = [];
    spine.forEach((root, index) => {
        const rootY = index ? -index * SPINE_STEP : 0;
        const ids = [root.id];
        for (const item of items) {
            if (item.spine) continue;
            let parent = item.parent;
            while (parent && parent !== root.id) parent = parentOf.get(parent);
            if (parent === root.id) ids.push(item.id);
        }
        const solved = octaveLayout(
            ids,
            new Map(ids.flatMap((id) => (parentOf.has(id) ? [[id, parentOf.get(id)!]] : []))),
            { card: CARD, maxDepth: 2, shape: 'ring' },
        );
        const [rootWidth] = cardSize(root);
        const direct = items.filter((item) => item.parent === root.id);
        const rowOf = new Map(
            direct.map((item, position) => [
                item.id,
                (position - (direct.length - 1) / 2) * SATELLITE_STEP,
            ]),
        );
        for (const id of ids) {
            const seed = byID.get(id)!;
            const octave = solved.octaves.get(id)?.octave ?? 0;
            let position: readonly [number, number, number];
            if (seed.spine) {
                position = [rootWidth / 2, rootY, 0];
            } else if (seed.parent === root.id) {
                position = [rootWidth + GUTTER_X, rootY + rowOf.get(id)!, 0];
            } else {
                const siblings = direct.filter((item) => item.id === seed.parent);
                const parent = siblings[0]!;
                const nested = items.filter((item) => item.parent === parent.id);
                const slot = nested.findIndex((item) => item.id === id);
                position = [
                    rootWidth + GUTTER_X + COLUMN_STEP,
                    rootY + rowOf.get(parent.id)! + (slot - (nested.length - 1) / 2) * 10,
                    0,
                ];
            }
            result.push({ ...seed, octave, position });
        }
    });
    return result;
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

const escapeHtml = (value: string): string =>
    value.replace(
        /[&<>"']/g,
        (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
    );

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

/** Console-like sizing: monospace line length sets width; height is fixed per octave. */
export function cardSize(item: LineSource): readonly [number, number] {
    const index = octaveIndex(item);
    const width = Math.min(
        MAX_WIDTH[index],
        Math.max(MIN_WIDTH[index], displayLine(item).length * CHAR_WIDTH[index] + 34),
    );
    return [width, ROW_HEIGHT[index]];
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

function requireElement<T extends HTMLElement>(id: string): T {
    const found = document.getElementById(id);
    if (!found) throw new Error(`transcript demo: missing #${id}`);
    return found as T;
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
    const expanded = new Set<string>();

    const detailFor = (item: TranscriptEvent, visible: readonly TranscriptEvent[]): HTMLElement => {
        const panel = document.createElement('div');
        panel.className = 'row-detail';
        const children = items.filter((candidate) => candidate.parent === item.id);
        const info = document.createElement('p');
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
        panel.append(info, actions);
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
        const visible = items.filter((item) => matchesFilter(item, filter));
        rows.replaceChildren(...visible.map((item) => rowFor(item, visible)));
        requireElement('row-count').textContent = String(visible.length);
        const errors = items.filter((item) => item.kind === 'error').length;
        const pending = items.filter((item) => item.status === 'pending').length;
        requireElement('summary').textContent =
            `${items.length} events · ${errors} failure · ${pending} awaiting approval`;
        requireElement('attention').textContent = errors
            ? `${errors} failure · ${pending} approval`
            : '';
        requireElement('stat-nodes').textContent = String(items.length);
        const links =
            Math.max(0, items.filter((item) => item.spine).length - 1) +
            items.filter((item) => item.parent).length;
        requireElement('stat-edges').textContent = String(links);
    };

    const reveal = (id: string): void => {
        const item = items.find((candidate) => candidate.id === id);
        if (!item) return;
        selected = id;
        graph.select(id);
        canvas.querySelectorAll<HTMLElement>('[data-node-id]').forEach((node) => {
            node.querySelector('.zcard')?.setAttribute(
                'data-selected',
                String(node.dataset.nodeId === id),
            );
        });
        if (root.dataset.view !== 'transcript') graph.focusNode(id, 90, 0.35);
        renderRows();
        rows.querySelector<HTMLElement>(`[data-node="${id}"]`)?.scrollIntoView({
            block: 'nearest',
        });
        announcer.textContent = `${item.kind}: ${item.label} — ${item.text}`;
    };

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
                reveal(id);
                break;
            case 'next':
            case 'parent': {
                const target =
                    name === 'parent' ? item.parent : visibleIds()[visibleIds().indexOf(id) + 1];
                if (target) {
                    expanded.add(target);
                    reveal(target);
                }
                break;
            }
            case 'children': {
                const children = items.filter((candidate) => candidate.parent === id);
                for (const child of children) expanded.add(child.id);
                if (children[0]) reveal(children[0].id);
                break;
            }
            case 'collapse':
                expanded.delete(id);
                renderRows();
                break;
        }
    };

    const append = (candidate: Omit<TranscriptEvent, 'position'>): void => {
        const item = layoutEvents([...items, candidate]).at(-1)!;
        const previousSpine = [...items].reverse().find((entry) => entry.spine);
        const parent = item.parent ?? previousSpine?.id;
        items.push(item);
        graph.addNode(nodeFor(item));
        graph.show(item.id, matchesFilter(item, filter));
        if (parent) graph.addEdge(edgeFor(parent, item.id, `${parent}->${item.id}`, item.octave));
        renderRows();
    };

    const submit = (text: string): void => {
        const prompt = text.trim();
        if (!prompt) return;
        const id = `local-${++serial}`;
        const turn = Math.max(...items.map((item) => item.turn)) + 1;
        append(event(id, 'user', 'user message', prompt, 'complete', turn));
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
        }, 420);
    };

    const setView = (view: View): void => {
        root.dataset.view = view;
        document.querySelectorAll<HTMLButtonElement>('[data-view-value]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.viewValue === view));
        });
        requestAnimationFrame(() => {
            if (view !== 'transcript') graph.fitView(120, 0.35, visibleIds());
            announcer.textContent = `${view} surface`;
        });
    };

    const setFilter = (next: Filter): void => {
        filter = next;
        document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.filter === next));
        });
        for (const item of items) graph.show(item.id, matchesFilter(item, next));
        renderRows();
        if (visibleIds().length) graph.fitView(120, 0.35, visibleIds());
        announcer.textContent = `${next} filter · ${visibleIds().length} events`;
    };

    const visibleIds = (): string[] =>
        items.filter((item) => matchesFilter(item, filter)).map((item) => item.id);

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
        reveal(id);
    });
    graph.watch('node:click', (payload) => {
        const id = 'id' in payload ? payload.id : payload.node.id;
        reveal(id);
    });
    graph.watch('zoomband:change', ({ band }) => {
        requireElement('stat-band').textContent = band;
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
        root.dataset.theme = (change.target as HTMLSelectElement).value;
    });
    requireElement('fit').addEventListener('click', () => graph.fitView(120, 0.4, visibleIds()));
    requireElement('reset').addEventListener('click', () => {
        setFilter('all');
        reveal(items[0]!.id);
    });
    document.addEventListener('keydown', (key) => {
        const target = key.target as HTMLElement;
        if (key.key === '/' && target.tagName !== 'INPUT') {
            key.preventDefault();
            requireElement<HTMLInputElement>('prompt-input').focus();
        }
        if (key.key === 'Escape' && target.tagName === 'INPUT') target.blur();
    });

    root.dataset.theme = params.get('theme') ?? 'dark';
    requireElement<HTMLSelectElement>('theme').value = root.dataset.theme;
    renderRows();
    graph.render();
    graph.fitView(120, 0.4);
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
        },
    });
}

if (typeof document !== 'undefined' && document.getElementById('canvas')) {
    nodes.HtmlNode.MIN_SIZE = { width: 32, height: 6 };
    void boot();
}
