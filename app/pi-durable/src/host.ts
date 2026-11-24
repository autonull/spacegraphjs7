import { agentDomain } from '@spacegraphjs/agent';
import { VocabularyAdapter, type AdapterNode } from '@spacegraphjs/adapter';
import { DEFAULT_THEME, type RenderTheme } from '@spacegraphjs/renderer';
import { SpaceGraphRenderer } from '@spacegraphjs/spacegraph-renderer';
import {
    TabRegistry,
    tabKernel,
    toneOf,
    type KernelOp,
    type ViewState,
} from 'pi-kit';
import type { Feed } from './local-feed';

const THEME: RenderTheme = {
    ...DEFAULT_THEME,
    background: '#0b1016',
    surface: '#18232f',
    surfaceMuted: '#121a24',
    text: '#e8eef5',
    textMuted: '#8da0b4',
    border: '#263443',
    accent: '#61d4e3',
    success: '#74dba2',
    warning: '#f2bd70',
    error: '#f08383',
    edge: '#3d5570',
    edgeMuted: '#263443',
    selection: '#61d4e3',
    focus: '#f2bd70',
};

type DurableNode = AdapterNode & {
    readonly role?: string;
    readonly data?: Readonly<Record<string, unknown>>;
};

const GLOSSARY: Readonly<Record<string, string>> = {
    conversation: 'A durable conversation: one owner of its transcript and documents.',
    entry: 'An immutable transcript event committed to storage.',
    commit: 'One atomic durable write; every node here comes from a commit.',
    doc: 'A built-in document such as pi.live, pi.inbox or pi.usage.',
    task: 'A durable state machine that can be asleep, waiting or running.',
    fork: 'A new conversation starting at an existing entry.',
    signal: 'A typed value delivered to a sleeping task to wake it.',
};

const el = <T extends HTMLElement = HTMLElement>(id: string): T => {
    const node = document.getElementById(id);
    if (!node) throw new Error(`missing element #${id}`);
    return node as T;
};

const dataText = (node: { readonly data?: Readonly<Record<string, unknown>> }): string => {
    const text = node.data?.['text'];
    return typeof text === 'string' ? text : '';
};

export class DurableHost {
    readonly renderer = new SpaceGraphRenderer();
    readonly registry: TabRegistry;
    readonly #adapter = new VocabularyAdapter<DurableNode>({
        cardRoles: ['run', 'message', 'user', 'assistant', 'action', 'conversation', 'task', 'boundary', 'pending', 'artifact', 'config', 'state'],
        structuralKinds: ['conversation', 'run'],
        roleOf: (node) => node.role ?? node.kind,
        statusMap: {
            pending: 'warning',
            sleeping: 'warning',
            waiting: 'warning',
            active: 'running',
            streaming: 'running',
            running: 'running',
            failed: 'error',
            aborted: 'error',
            complete: 'success',
            settled: 'success',
            done: 'success',
        },
        extraNodeData: (node) => ({ text: dataText(node), duration: node.data?.['durationMs'] ?? null }),
    });
    #status: { readonly provider: string; readonly storage: string; readonly tasks: number } = {
        provider: 'local feed',
        storage: 'fixture',
        tasks: 0,
    };
    #viewName: 'graph' | 'tasks' | 'timeline' = 'graph';
    #ready = false;
    #offline = false;
    #edgeCount = 0;
    #fitted = false;
    #shot: string | undefined;
    #seed: string;

    onFork: (() => Promise<void>) | undefined;
    onApprove: (() => Promise<void>) | undefined;

    constructor(registry: TabRegistry, offline = false, shot?: string, seed = 'fixed') {
        this.registry = registry;
        this.#offline = offline;
        this.#shot = shot;
        this.#seed = seed;
    }

    async mount(container: HTMLElement): Promise<void> {
        await this.renderer.mount(container, { theme: THEME, projection: '2d' });
        this.renderer.on('nodeClick', ({ id }) => this.select(id));
        this.renderer.on('viewportChange', ({ zoom, center }) =>
            this.patchView({ camera: { zoom, center } }),
        );
        this.renderer.on('bandChange', ({ band }) => this.patchView({ band }));
        this.renderGlossary();
        this.bindChrome();
        this.#ready = true;
        this.refresh();
        this.renderer.fit();
    }

    ready(): boolean {
        return this.#ready;
    }

    offline(): boolean {
        return this.#offline;
    }

    setStatus(status: { readonly provider: string; readonly storage: string; readonly tasks: number }): void {
        this.#status = status;
        this.renderStatus();
    }

    loadFeed(feed: Feed): void {
        for (const entry of feed.tabs) this.registry.add(entry.id, entry.ops);
        this.registry.setActive(feed.active);
        this.refresh();
    }

    consume(conversationID: string, op: KernelOp): void {
        const isNew = !this.registry.get(conversationID);
        this.registry.append(conversationID, op, Date.now());
        if (isNew) this.renderTabs();
        if (this.registry.activeID() === conversationID) this.refresh();
    }

    setTab(id: string): boolean {
        if (!this.registry.setActive(id)) return false;
        const view = this.registry.active()?.view;
        if (view?.camera)
            this.renderer.setViewport({
                zoom: view.camera.zoom,
                center: [...view.camera.center] as [number, number, number],
            });
        if (view?.selection) this.renderer.setSelection([view.selection]);
        this.refresh();
        this.announce(`Switched to conversation ${id}`);
        return true;
    }

    select(id: string): void {
        this.renderer.setSelection([id]);
        this.patchView({ selection: id, focus: id });
        const node = tabKernel(this.registry.active()!)
            .nodes.find((candidate) => candidate.id === id);
        el('inspector').innerHTML = node
            ? `<strong>${escapeHTML(node.label)}</strong><br>${escapeHTML(node.kind)} · ${escapeHTML(String(node.data?.['status'] ?? 'committed'))}${dataText(node) ? `<br>${escapeHTML(dataText(node))}` : ''}`
            : 'Select a node to inspect its committed facts.';
    }

    reveal(id: string): void {
        this.select(id);
        this.renderer.focus(id);
        this.announce(`Revealed ${id}`);
    }

    focus(id: string): void {
        this.select(id);
        this.renderer.focus(id);
    }

    patchView(patch: Partial<ViewState>): void {
        const tab = this.registry.active();
        if (tab) this.registry.setView(tab.id, { ...tab.view, ...patch });
    }

    refresh(): void {
        const tab = this.registry.active();
        if (!tab) return;
        const kernel = tabKernel(tab);
        const view = agentDomain.build(kernel);
        const positions = new Map(
            view.nodes.map((node, index) => [
                node.id,
                { x: (index % 4) * 250, y: Math.floor(index / 4) * 140, z: 0 },
            ]),
        );
        const model = this.#adapter.build(
            {
                nodes: view.nodes.map((node): DurableNode => ({
                    id: node.id,
                    kind: node.kind,
                    label: node.label,
                    status: String(node.data?.['status'] ?? ''),
                    summary: dataText(node),
                    role: String(node.data?.['role'] ?? node.kind),
                    data: node.data,
                })),
                edges: view.edges.map((edge) => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    kind: edge.kind,
                })),
            },
            { level: 'execution', positions, focus: tab.view.focus, cardBudget: 30 },
        );
        this.renderer.setModel(model);
        this.#edgeCount = model.edges.length;
        if (!this.#fitted && view.nodes.length) {
            this.#fitted = true;
            requestAnimationFrame(() => this.renderer.fit());
        }
        this.renderTabs();
        this.renderStatus();
        this.renderTasks(kernel.nodes);
        this.renderTimeline(kernel.nodes, kernel.edges);
        this.renderView();
        this.opsCount = kernel.nodes.length + kernel.edges.length;
    }

    opsCount = 0;

    cycleView(): void {
        const names = ['graph', 'tasks', 'timeline'] as const;
        this.setView(names[(names.indexOf(this.#viewName) + 1) % names.length]!);
    }

    setView(name: 'graph' | 'tasks' | 'timeline'): void {
        this.#viewName = name;
        this.renderView();
        this.announce(`${name} view`);
    }

    announce(message: string): void {
        el('announcer').textContent = message;
    }

    applyShot(id: string): void {
        this.#shot = id;
        if (id === 'task-graph') this.setView('tasks');
        if (id === 'timeline') this.setView('timeline');
        this.announce(`Shot ${id}`);
    }

    permalink(): string {
        const tab = this.registry.active();
        const params = new URLSearchParams({ s: tab?.id ?? '' });
        if (this.#shot) params.set('shot', this.#shot);
        if (this.#seed !== 'fixed') params.set('seed', this.#seed);
        return `${location.pathname}?${params.toString()}`;
    }

    applyPermalink(value: string): boolean {
        const params = new URLSearchParams(value.includes('?') ? value.split('?')[1] : value);
        const id = params.get('s');
        if (id && this.registry.get(id)) return this.setTab(id);
        return false;
    }

    hooks(): Record<string, unknown> {
        return {
            ready: () => this.#ready,
            ops: () => this.opsCount,
            sessions: () => this.registry.list().map((tab) => tab.id),
            activeTab: () => this.registry.activeID(),
            setTab: (id: string) => this.setTab(id),
            reveal: (id: string) => this.reveal(id),
            focus: (id: string) => this.focus(id),
            applyShot: (id: string) => this.applyShot(id),
            permalink: () => this.permalink(),
            applyPermalink: (value: string) => this.applyPermalink(value),
            export: (format: string) => this.export(format),
            health: () => ({ ...this.#status, offline: this.#offline }),
            prompt: async (text: string, mode: 'steer' | 'followUp' = 'steer') => {
                const input = el<HTMLInputElement>('prompt-input');
                input.value = text;
                el<HTMLSelectElement>('prompt-mode').value = mode;
                el<HTMLFormElement>('prompt-form').requestSubmit();
                return { ok: true };
            },
            viewport: () => this.renderer.getViewport?.() ?? { zoom: 1, center: [0, 0, 0] },
            vision: () => this.vision(),
            offline: () => this.#offline,
            shot: () => this.#shot ?? null,
        };
    }

    vision(): { readonly score: number; readonly nodes: number; readonly edges: number; readonly canvas: boolean } {
        const canvas = Boolean(el('canvas').querySelector('canvas'));
        const cards = el('canvas').querySelectorAll('[data-kind]').length;
        const score = canvas && this.opsCount > 0 ? Math.min(1, 0.5 + cards / 40 + this.opsCount / 100) : 0;
        return { score, nodes: this.opsCount, edges: this.#edgeCount, canvas };
    }

    export(format: string): void {
        const tab = this.registry.active();
        if (!tab) return;
        if (this.#offline) {
            const blob = new Blob([JSON.stringify({ tab: tab.id, view: tab.view, shot: this.#shot })], {
                type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `conversation-${tab.id}.${format === 'json' ? 'json' : format === 'session' ? 'session.json' : format === 'svg' ? 'svg' : 'md'}`;
            anchor.click();
            URL.revokeObjectURL(url);
            return;
        }
        const params = new URLSearchParams({ format, id: tab.id });
        location.assign(`/api/export?${params.toString()}`);
    }

    private renderTabs(): void {
        const strip = el('tab-strip');
        strip.replaceChildren(
            ...this.registry.list().map((tab) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'tab';
                button.setAttribute('role', 'tab');
                button.dataset['tab'] = tab.id;
                button.textContent = tab.id;
                const active = this.registry.activeID() === tab.id;
                button.setAttribute('aria-selected', String(active));
                button.tabIndex = active ? 0 : -1;
                button.addEventListener('click', () => this.setTab(tab.id));
                button.addEventListener('keydown', (event) => {
                    const rtl = document.dir === 'rtl';
                    const delta = event.key === 'ArrowRight' ? (rtl ? -1 : 1) : event.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0;
                    if (!delta) return;
                    event.preventDefault();
                    const tabs = this.registry.list();
                    const index = tabs.findIndex((entry) => entry.id === tab.id);
                    const next = tabs[(index + delta + tabs.length) % tabs.length]!;
                    this.setTab(next.id);
                    strip.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus();
                });
                return button;
            }),
        );
    }

    private renderStatus(): void {
        const tab = this.registry.active() ?? this.registry.list()[0];
        const sleeping = tab
            ? tabKernel(tab).nodes.filter((node) => node.kind === 'task' && node.data?.['status'] === 'sleeping').length
            : 0;
        el('status-strip').replaceChildren(
            ...[
                [`provider: ${this.#status.provider}`, 'accent'],
                [`storage: ${this.#status.storage}`, 'muted'],
                [`${this.#status.tasks} task${this.#status.tasks === 1 ? '' : 's'}`, sleeping ? 'warn' : 'ok'],
                [`tab ${this.registry.activeID()}`, 'ok'],
            ].map(([label, tone]) => {
                const badge = document.createElement('span');
                badge.className = 'badge';
                badge.dataset['tone'] = tone;
                badge.textContent = label;
                return badge;
            }),
        );
    }

    private renderTasks(nodes: readonly { readonly id: string; readonly label: string; readonly kind: string; readonly data?: Readonly<Record<string, unknown>> }[]): void {
        const tasks = nodes.filter((node) => node.kind === 'task');
        el('tasks').replaceChildren(
            ...(tasks.length
                ? tasks.map((node) => {
                      const status = String(node.data?.['status'] ?? 'pending');
                      const row = document.createElement('div');
                      row.className = 'row';
                      row.innerHTML = `<span class="label">${escapeHTML(node.label)}</span><span class="value" data-tone="${toneOf(node.kind, status)}">${escapeHTML(status)}${node.data?.['signals'] ? `<br>${escapeHTML(String(node.data['signals']))}` : ''}</span>`;
                      return row;
                  })
                : [textRow('No live tasks')]),
        );
    }

    private renderTimeline(
        nodes: readonly { readonly id: string; readonly label: string; readonly kind: string; readonly data?: Readonly<Record<string, unknown>> }[],
        edges: readonly { readonly kind: string; readonly source: string; readonly target: string }[],
    ): void {
        const ordered = new Set(edges.filter((edge) => edge.kind === 'orders').map((edge) => edge.target));
        const timeline = nodes.filter(
            (node) => ordered.has(node.id) || ['message', 'boundary', 'state'].includes(node.kind),
        );
        el('timeline').replaceChildren(
            ...(timeline.length
                ? timeline.map((node) => {
                      const row = document.createElement('div');
                      row.className = 'row';
                      row.innerHTML = `<span class="label">${escapeHTML(node.kind)}</span><span class="value">${escapeHTML(dataText(node) || node.label)}</span>`;
                      return row;
                  })
                : [textRow('No committed entries')]),
        );
    }

    private renderView(): void {
        el('tasks').toggleAttribute('data-active', this.#viewName === 'tasks');
        el('timeline').toggleAttribute('data-active', this.#viewName === 'timeline');
        for (const button of document.querySelectorAll<HTMLButtonElement>('#view-switch button'))
            button.setAttribute('aria-selected', String(button.dataset['view'] === this.#viewName));
    }

    private renderGlossary(): void {
        el('glossary').replaceChildren(
            ...Object.entries(GLOSSARY).map(([term, definition]) => {
                const row = document.createElement('div');
                row.className = 'row';
                row.title = definition;
                row.innerHTML = `<span class="label">${escapeHTML(term)}</span>`;
                return row;
            }),
        );
    }

    private bindChrome(): void {
        for (const button of document.querySelectorAll<HTMLButtonElement>('#view-switch button'))
            button.addEventListener('click', () => this.setView(button.dataset['view'] as 'graph' | 'tasks' | 'timeline'));
        el('help-close').addEventListener('click', () => this.toggleHelp(false));
    }

    toggleHelp(visible?: boolean): void {
        const help = el('help');
        const next = visible ?? help.hidden;
        help.hidden = !next;
    }
}

const textRow = (label: string): HTMLElement => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<span class="label">${escapeHTML(label)}</span>`;
    return row;
};

const escapeHTML = (value: string): string =>
    value.replace(/[&<>"']/g, (char) =>
        char === '&' ? '&amp;' : char === '<' ? '&lt;' : char === '>' ? '&gt;' : char === '"' ? '&quot;' : '&#39;',
    );
