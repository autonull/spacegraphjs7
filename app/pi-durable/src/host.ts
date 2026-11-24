import { agentDomain } from '@spacegraphjs/agent';
import { VocabularyAdapter, type AdapterNode } from '@spacegraphjs/adapter';
import { diffKernels, Kernel } from '@spacegraphjs/kernel';
import { DEFAULT_THEME, type RenderTheme } from '@spacegraphjs/renderer';
import { SpaceGraphRenderer } from '@spacegraphjs/spacegraph-renderer';
import { ScopeSimulation, type ScopeSpec } from 'spacegraphjs/layout';
import { ZoomBands } from 'spacegraphjs/zoom';
import {
    buildScopes,
    TabRegistry,
    tabKernel,
    toneOf,
    type KernelOp,
    type ScopeEdge,
    type ScopeNode,
    type ViewState,
} from 'pi-kit';
import type { Feed } from './local-feed';
import { localFeed } from './local-feed';
import { replayFeed } from './replay';
import { isRung, RUNGS, rungView, type Rung } from './rungs';
import { VIEW_NAMES, type ViewName } from './scenarios';
import { shotById } from './shots';
import { asOfFeed } from './time-travel';

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

type Importance = 'hero' | 'medium' | 'compact';
type ImportanceSize = Readonly<Record<Importance, readonly [number, number]>>;

type DurableNode = AdapterNode & {
    readonly role?: string;
    readonly importance: Importance;
    readonly data?: Readonly<Record<string, unknown>>;
};

const IMPORTANCE_SIZE: ImportanceSize = {
    hero: [280, 120],
    medium: [190, 72],
    compact: [110, 40],
};

const VIEW_LABELS: Readonly<Record<ViewName, string>> = {
    graph: 'facts', tasks: 'owners', timeline: 'order', diff: 'delta',
    trace: 'spans', docs: 'documents', transcript: 'entries',
};

const ZOOM_RANGE = { min: 0.25, max: 4, closerIsLarger: true } as const;

const GLOSSARY: Readonly<Record<string, string>> = {
    conversation: 'A durable conversation: one owner of its transcript and documents.',
    entry: 'An immutable transcript event committed to storage.',
    commit: 'One atomic durable write; every node here comes from a commit.',
    doc: 'A built-in document such as pi.live, pi.inbox or pi.usage.',
    task: 'A durable state machine that can be asleep, waiting or running.',
    fork: 'A new conversation starting at an existing entry.',
    signal: 'A typed value delivered to a sleeping task to wake it.',
};

const TASK_KINDS = new Set(['conversation', 'run', 'task', 'pending']);
const TIMELINE_KINDS = new Set(['conversation', 'run', 'message', 'boundary', 'state', 'action']);
const TRANSCRIPT_KINDS = new Set(['message', 'boundary', 'state', 'action']);
const CONTAINMENT = new Set(['orders', 'owns', 'waiting.on', 'sleeps-on', 'delegates', 'retry', 'checkpoint', 'fork', 'forkedFrom']);

const NODE_LABELS: Readonly<Record<string, string>> = {
    'pi.usage': 'Usage', 'pi.agent': 'Agent', 'pi.provider': 'Provider',
    'pi.live': 'Live state', 'pi.settings': 'Settings', 'pi.env': 'Environment',
    'pi.extension': 'Extension', 'pi.instructions': 'Instructions',
    'pi.error': 'Error', 'pi.trace': 'Agent events', 'app.todos': 'Host todos',
};

const EDGE_LABELS: Readonly<Record<string, string>> = {
    orders: 'order', owns: 'owns', 'waiting.on': 'waits on', 'sleeps-on': 'sleeps on',
    delegates: 'delegates', retry: 'retry', checkpoint: 'checkpoint', fork: 'fork', forkedFrom: 'forked from',
};

const short = (value: string, max = 72): string =>
    value.length > max ? `${value.slice(0, max)}…` : value;

const labelForNode = (node: DurableNode): string => {
    if (node.kind === 'task' && node.data?.['kind'] === 'durable.approval')
        return `Approval task ${String(node.data['taskId'] ?? '')}`.trim();
    return NODE_LABELS[node.label] ?? node.label;
};

const summaryForNode = (node: DurableNode): string => {
    const parts: string[] = [];
    const text = dataText(node);
    if (text) parts.push(short(text));
    const diff = node.data?.['diff'];
    if (typeof diff === 'string') parts.push(diff);
    const trace = node.data?.['trace'];
    if (typeof trace === 'string') parts.push(`span ${short(trace, 48)}`);
    const role = node.data?.['role'];
    if (typeof role === 'string' && role !== node.kind) parts.push(role);
    if (node.status) parts.push(node.status);
    const signals = node.data?.['signals'];
    if (typeof signals === 'string' && signals) parts.push(`signal: ${signals}`);
    const until = node.data?.['until'];
    if (typeof until === 'number') parts.push(`wakes ${new Date(until).toISOString().slice(0, 16)}Z`);
    const toolName = node.data?.['toolName'];
    if (typeof toolName === 'string') parts.push(`tool ${toolName}`);
    if (node.data?.['head'] !== undefined) parts.push(`head ${String(node.data['head'])}`);
    if (node.data?.['deferred'] === true) parts.push('deferred');
    const error = node.data?.['error'];
    if (typeof error === 'string') parts.push(`error ${error}`);
    const recovery = node.data?.['recovery'];
    if (typeof recovery === 'string') parts.push(`recovery ${short(recovery, 40)}`);
    return parts.join(' · ');
};

const cardTemplate = (node: DurableNode): string => {
    const summary = summaryForNode(node);
    const status = node.status ? `<span class="card-status">${escapeHTML(node.status)}</span>` : '';
    const diff = typeof node.data?.['diff'] === 'string' ? String(node.data['diff']) : '';
    return `<div class="durable-card ${node.importance}" data-kind="${escapeHTML(node.kind)}" data-status="${escapeHTML(node.status)}" data-importance="${node.importance}"${diff ? ` data-diff="${diff}"` : ''}><span class="card-label">${escapeHTML(labelForNode(node))}${status}</span>${summary ? `<span class="card-summary">${escapeHTML(summary)}</span>` : ''}</div>`;
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
        extraNodeData: (node) => ({
            text: dataText(node),
            duration: node.data?.['durationMs'] ?? null,
            importance: node.importance,
            style: {
                width: `${IMPORTANCE_SIZE[node.importance][0]}px`,
                height: `${IMPORTANCE_SIZE[node.importance][1]}px`,
            },
        }),
        extraEdgeData: (edge) => ({ label: EDGE_LABELS[edge.kind] ?? edge.kind }),
    }, {
        nodeSizeFn: (node: DurableNode) => IMPORTANCE_SIZE[node.importance],
        renderCardTemplate: cardTemplate,
    });
    #status: { readonly provider: string; readonly storage: string; readonly tasks: number } = {
        provider: 'local feed',
        storage: 'fixture',
        tasks: 0,
    };
    #viewName: ViewName = 'graph';
    #rung: Rung = 'fact';
    readonly #bands = new ZoomBands({
        bands: RUNGS.map((rung, index) => ({
            id: rung.id,
            min: index / RUNGS.length,
            max: (index + 1) / RUNGS.length,
            label: rung.label,
        })),
        hysteresis: 0.03,
    });
    #ready = false;
    #offline = false;
    #edgeCount = 0;
    #fitted = false;
    #shot: string | undefined;
    #seed: string;
    #presented: { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] } = {
        nodes: [], edges: [],
    };
    #zoomDriven = false;
    #overviewBounds: { minX: number; maxX: number; minY: number; maxY: number } | undefined;
    #laneNames: readonly string[] = [];
    #axisNames: readonly string[] = [];
    #edgeLabels: readonly string[] = [];
    readonly #simulation = new ScopeSimulation({
        instant: true,
        layout: { seed: 7, strategy: 'grid', gap: 300, depthStep: 170, nodePadding: 28 },
    });

    onFork: (() => Promise<void>) | undefined;
    onApprove: (() => Promise<void>) | undefined;

    constructor(registry: TabRegistry, offline = false, shot?: string, seed = 'fixed', rung?: Rung) {
        this.registry = registry;
        this.#offline = offline;
        this.#shot = shot;
        this.#seed = seed;
        if (rung && isRung(rung)) this.#rung = rung;
        this.#bands.onChange((change) => {
            if (isRung(change.band)) this.setRung(change.band);
        });
    }

    async mount(container: HTMLElement): Promise<void> {
        await this.renderer.mount(container, { theme: THEME, projection: '2d' });
        this.renderer.on('nodeClick', ({ id }) => this.select(id));
        this.renderer.on('viewportChange', ({ zoom, center }) => {
            if (this.#zoomDriven) this.#bands.feed(zoom, ZOOM_RANGE);
            this.patchView({ camera: { zoom, center } });
            this.renderOverview();
        });
        this.renderer.on('bandChange', ({ band }) => this.patchView({ band }));
        this.renderGlossary();
        this.renderLegend();
        this.renderRungs();
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
        const tab = this.registry.active()!;
        const kernel = tabKernel(tab);
        const node = kernel.nodes.find((candidate) => candidate.id === id);
        if (!node) {
            el('inspector').innerHTML = 'Select a node to inspect its committed facts.';
            return;
        }
        const durable: DurableNode = {
            id: node.id,
            kind: node.kind,
            label: node.label,
            status: String(node.data?.['status'] ?? ''),
            role: String(node.data?.['role'] ?? node.kind),
            importance: 'medium',
            data: node.data,
        };
        const links = kernel.edges
            .filter((edge) => edge.source === id || edge.target === id)
            .map((edge) => EDGE_LABELS[edge.kind] ?? edge.kind);
        el('inspector').innerHTML = `<strong>${escapeHTML(labelForNode(durable))}</strong><br>${escapeHTML(node.kind)} · ${escapeHTML(String(node.data?.['status'] ?? 'committed'))}${summaryForNode(durable) ? `<br>${escapeHTML(summaryForNode(durable))}` : ''}<br><code>${escapeHTML(node.id)}</code>${links.length ? `<br>links: ${escapeHTML([...new Set(links)].join(', '))}` : ''}`;
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
        const presented = this.#presentation(agentDomain.build(kernel), kernel, tab.view.focus);
        const positions = this.#layout(presented.nodes, presented.edges);
        const labels = this.#labels(presented, positions);
        this.#presented = presented;
        this.#laneNames = labels.laneLabels.map((lane) => lane.label);
        this.#axisNames = labels.axisLabels.map((axis) => axis.label);
        const model = this.#adapter.build(
            {
                nodes: presented.nodes.map((node): DurableNode => {
                    const durable: DurableNode = {
                        id: node.id,
                        kind: node.kind,
                        label: node.label ?? node.id,
                        status: String(node.data?.['status'] ?? ''),
                        role: String(node.data?.['role'] ?? node.kind),
                        importance: this.#importanceOf(node),
                        data: node.data,
                    };
                    return {
                        ...durable,
                        label: labelForNode(durable),
                        summary: summaryForNode(durable),
                    };
                }),
                edges: presented.edges.map((edge) => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    kind: edge.kind,
                })),
            },
            { level: 'execution', positions, focus: tab.view.focus, cardBudget: 30, ...labels },
        );
        this.renderer.setModel(model);
        this.#edgeCount = model.edges.length;
        this.#edgeLabels = model.edges.flatMap((edge) => (edge.label ? [edge.label] : []));
        if (!this.#fitted && presented.nodes.length) {
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
        this.setView(VIEW_NAMES[(VIEW_NAMES.indexOf(this.#viewName) + 1) % VIEW_NAMES.length]!);
    }

    setView(name: ViewName): void {
        if (name === this.#viewName) return;
        this.#viewName = name;
        this.refresh();
        requestAnimationFrame(() => this.renderer.fit());
        this.renderView();
        this.announce(`${name} view`);
    }

    setRung(rung: Rung): boolean {
        if (!isRung(rung)) return false;
        if (!this.#ready) {
            this.#rung = rung;
            return true;
        }
        if (rung === this.#rung) return false;
        this.#zoomDriven = false;
        this.#rung = rung;
        this.renderRungs();
        this.refresh();
        this.renderOverview();
        this.announce(`${RUNGS.find((entry) => entry.id === rung)!.label} rung`);
        return true;
    }

    zoomBy(factor: number): void {
        const viewport = this.renderer.getViewport?.();
        if (!viewport) return;
        this.#zoomDriven = true;
        this.renderer.setViewport({ zoom: viewport.zoom * factor, center: viewport.center });
        this.#bands.feed(viewport.zoom * factor, ZOOM_RANGE);
    }

    announce(message: string): void {
        el('announcer').textContent = message;
    }

    setAsOf(seq?: number): void {
        const badge = el('asof-badge');
        if (seq === undefined) {
            el('app').removeAttribute('data-asof');
            badge.hidden = true;
            return;
        }
        el('app').dataset['asof'] = String(seq);
        badge.textContent = `as of ${seq}`;
        badge.hidden = false;
    }

    applyShot(id: string): void {
        this.#shot = id;
        const rail = shotById(id)?.rail ?? 'graph';
        this.setView(VIEW_NAMES.includes(rail) ? rail : 'graph');
        this.announce(`Shot ${id}`);
    }

    permalink(): string {
        const tab = this.registry.active();
        const params = new URLSearchParams({ s: tab?.id ?? '' });
        if (this.#shot) params.set('shot', this.#shot);
        if (this.#rung !== 'fact') params.set('rung', this.#rung);
        if (this.#seed !== 'fixed') params.set('seed', this.#seed);
        return `${location.pathname}?${params.toString()}`;
    }

    applyPermalink(value: string): boolean {
        const params = new URLSearchParams(value.includes('?') ? value.split('?')[1] : value);
        const id = params.get('s');
        const rung = params.get('rung');
        if (rung && isRung(rung)) this.setRung(rung);
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
            setAsOf: (seq?: number) => this.setAsOf(seq),
            loadShot: (id: string, options?: { readonly replay?: boolean; readonly asOf?: number }) => {
                const feed = options?.replay
                    ? replayFeed(id, this.#seed)
                    : options?.asOf !== undefined
                        ? asOfFeed(id, options.asOf)
                        : localFeed(undefined, this.#seed, id);
                this.loadFeed(feed);
                this.setAsOf(options?.asOf);
                this.applyShot(id);
                return true;
            },
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
            viewName: () => this.#viewName,
            rung: () => this.#rung,
            setRung: (rung: string) => this.setRung(rung as Rung),
            zoomBy: (factor: number) => this.zoomBy(factor),
            setView: (name: string) => {
                if (!VIEW_NAMES.includes(name as ViewName)) return false;
                this.setView(name as ViewName);
                return true;
            },
            representation: () => ({
                view: this.#viewName,
                nodes: this.#presented.nodes.length,
                edgeKinds: this.#presented.edges.map((edge) => edge.kind),
                edgeLabels: [...this.#edgeLabels],
                laneLabels: [...this.#laneNames],
                axisLabels: [...this.#axisNames],
                importance: this.#presented.nodes.reduce<Record<string, number>>((counts, node) => {
                    const tier = this.#importanceOf(node);
                    counts[tier] = (counts[tier] ?? 0) + 1;
                    return counts;
                }, {}),
            }),
            layout: () => ({
                view: this.#viewName,
                nodes: this.#simulation.positions.size,
                first: [...this.#simulation.positions.values()][0] ?? null,
            }),
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

    /** One position authority: kit scopes define targets; the simulation owns the current frame. */
    #layout(
        nodes: readonly ScopeNode[],
        edges: readonly ScopeEdge[],
    ): ReadonlyMap<string, { readonly x: number; readonly y: number; readonly z: number }> {
        const ids = new Set(nodes.map((node) => node.id));
        const placed = edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
        const contains: ScopeEdge[] = placed
            .filter((edge) => CONTAINMENT.has(edge.kind))
            .map((edge, index) => ({ id: `contains-${index}`, source: edge.source, target: edge.target, kind: 'contains' }));
        const scopes = buildScopes(nodes, contains, 300);
        const spec: ScopeSpec = {
            id: 'root',
            strategy: 'grid',
            nodes: nodes.map((node, index) => ({ id: node.id, lane: this.#viewName, row: index })),
            edges: placed,
        };
        this.#simulation.setSpecs([spec]);
        this.#simulation.setLayoutTargets(new Map(
            scopes.map((scope) => [
                `root/${scope.id}`,
                { x: scope.position[0], y: scope.position[1], z: scope.position[2] },
            ]),
        ));
        this.#simulation.settle();
        return new Map(
            [...this.#simulation.view().positions].map(([qualified, position]) => [
                qualified.slice('root/'.length),
                position,
            ]),
        );
    }

    /** Every placement reads the same folded kernel; only the selected data facet changes. */
    #presentation(
        view: { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] },
        kernel: Kernel,
        focus: string | undefined,
    ): { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] } {
        const data = this.#viewData(view, kernel);
        const heroes = this.#heroIDs(data.nodes);
        if (focus) heroes.add(focus);
        return {
            nodes: data.nodes.map((node) => ({
                ...node,
                data: { ...node.data, importance: heroes.has(node.id) ? 'hero' : this.#importanceOf(node) },
            })),
            edges: data.edges,
        };
    }

    #heroIDs(nodes: readonly ScopeNode[]): Set<string> {
        const heroes = new Set<string>();
        for (const node of nodes) {
            if (node.kind === 'conversation' || node.kind === 'run') heroes.add(node.id);
            if (node.kind === 'message' && node.data?.['role'] === 'assistant') heroes.add(node.id);
            if (node.kind === 'boundary' && node.data?.['head'] !== undefined) heroes.add(node.id);
        }
        return heroes;
    }

    #importanceOf(node: ScopeNode): Importance {
        const declared = node.data?.['importance'];
        if (declared === 'hero' || declared === 'medium' || declared === 'compact') return declared;
        const status = String(node.data?.['status'] ?? '');
        if (node.kind === 'task' && ['active', 'running', 'streaming', 'sleeping', 'waiting'].includes(status))
            return 'hero';
        return ['message', 'action', 'boundary', 'task', 'pending'].includes(node.kind) ? 'medium' : 'compact';
    }

    #viewData(
        view: { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] },
        kernel: Kernel,
    ): { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] } {
        return rungView(this.#rung, this.#viewDataForView(view, kernel));
    }

    #viewDataForView(
        view: { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] },
        kernel: Kernel,
    ): { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] } {
        const { nodes, edges } = view;
        if (this.#viewName === 'graph') return view;
        if (this.#viewName === 'trace') return { nodes: this.#traceNodes(view), edges: [] };
        if (this.#viewName === 'docs')
            return { nodes: nodes.filter((node) => typeof node.data?.['doc'] === 'string'), edges: [] };
        if (this.#viewName === 'diff') return this.#diffData(view, kernel);
        const kinds = this.#viewName === 'tasks'
            ? TASK_KINDS
            : this.#viewName === 'transcript'
                ? TRANSCRIPT_KINDS
                : TIMELINE_KINDS;
        const ids = new Set(nodes.filter((node) => kinds.has(node.kind)).map((node) => node.id));
        return {
            nodes: nodes.filter((node) => ids.has(node.id)),
            edges: edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)
                && (this.#viewName !== 'transcript' || ['orders', 'checkpoint'].includes(edge.kind))),
        };
    }

    #traceNodes(view: { readonly nodes: readonly ScopeNode[] }): readonly ScopeNode[] {
        const spans = view.nodes.flatMap((node) => {
            const trace = node.data?.['trace'];
            if (!trace || typeof trace !== 'object' || Array.isArray(trace) || !('spans' in trace)) return [];
            const values = (trace as { readonly spans?: unknown }).spans;
            if (!Array.isArray(values)) return [];
            return values
                .filter((span): span is string => typeof span === 'string')
                .map((span, index): ScopeNode => ({
                    id: `${node.id}:span:${index}`,
                    kind: 'state',
                    label: span,
                    data: { status: 'complete', trace: span, importance: 'compact' },
                }));
        });
        return spans.length ? spans : view.nodes.filter((node) => node.data?.['trace'] !== undefined);
    }

    /** Diff nodes and edges come only from the two kernels; the view invents no causal link. */
    #diffData(
        view: { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] },
        kernel: Kernel,
    ): { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] } {
        const peer = this.registry.list().find((tab) => tab.id !== this.registry.activeID());
        const diff = diffKernels(peer ? tabKernel(peer) : new Kernel(), kernel);
        const added = new Set([...diff.nodes.added, ...diff.nodes.changed].map((node) => node.id));
        const nodes: ScopeNode[] = [
            ...view.nodes
                .filter((node) => added.has(node.id))
                .map((node) => ({ ...node, data: { ...node.data, diff: 'added' } })),
            ...diff.nodes.removed.map((node): ScopeNode => ({
                id: node.id,
                kind: node.kind,
                label: node.label,
                data: { ...node.data, status: 'removed', diff: 'removed' },
            })),
        ];
        const delta = new Map<string, 'added' | 'removed'>();
        for (const edge of diff.edges.added) delta.set(edge.id, 'added');
        for (const edge of diff.edges.removed) if (!delta.has(edge.id)) delta.set(edge.id, 'removed');
        const ids = new Set(nodes.map((node) => node.id));
        return {
            nodes,
            edges: [
                ...view.edges.filter((edge) => delta.get(edge.id) === 'added'),
                ...diff.edges.removed,
            ].filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
        };
    }

    #labels(
        presented: { readonly nodes: readonly ScopeNode[] },
        positions: ReadonlyMap<string, { readonly x: number; readonly y: number; readonly z: number }>,
    ): {
        readonly laneLabels: readonly { id: string; label: string; y: number; anchorNodeId?: string }[];
        readonly axisLabels: readonly { id: string; label: string; x: number; y: number; role: 'row' | 'column' }[];
    } {
        const first = presented.nodes[0];
        if (!first) return { laneLabels: [], axisLabels: [] };
        const y = positions.get(first.id)?.y ?? 0;
        const laneLabels = this.#viewName === 'diff'
            ? ['added', 'removed'].flatMap((kind) => {
                  const anchor = presented.nodes.find((node) => node.data?.['diff'] === kind);
                  return anchor
                      ? [{ id: kind, label: kind, y: positions.get(anchor.id)?.y ?? y, anchorNodeId: anchor.id }]
                      : [];
              })
            : [{ id: this.#viewName, label: VIEW_LABELS[this.#viewName], y, anchorNodeId: first.id }];
        const axisLabels = this.#viewName === 'timeline' || this.#viewName === 'transcript'
            ? [{ id: 'order', label: 'committed order', x: 0, y: y - 90, role: 'column' as const }]
            : [];
        return { laneLabels, axisLabels };
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

    private renderRungs(): void {
        el('rung-switch').replaceChildren(
            ...RUNGS.map((rung) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset['rung'] = rung.id;
                button.textContent = rung.label.toLowerCase();
                button.title = rung.description;
                button.setAttribute('aria-current', String(this.#rung === rung.id));
                button.addEventListener('click', () => this.setRung(rung.id));
                return button;
            }),
        );
        el('app').dataset['rung'] = this.#rung;
        el('rung-caption').textContent = RUNGS.find((entry) => entry.id === this.#rung)!.description;
    }

    private renderOverview(): void {
        if (!this.#ready) return;
        const positions = [...this.#simulation.view().positions.values()];
        const svg = document.getElementById('survey-svg') as unknown as SVGSVGElement;
        if (!positions.length) {
            this.#overviewBounds = undefined;
            svg.replaceChildren();
            return;
        }
        const xs = positions.map((position) => position.x);
        const ys = positions.map((position) => position.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        this.#overviewBounds = { minX, maxX, minY, maxY };
        const width = Math.max(1, maxX - minX);
        const height = Math.max(1, maxY - minY);
        const mapX = (x: number) => 8 + ((x - minX) / width) * 144;
        const mapY = (y: number) => 8 + ((y - minY) / height) * 84;
        const dots = positions
            .map((position) => `<circle cx="${mapX(position.x).toFixed(1)}" cy="${mapY(position.y).toFixed(1)}" r="2.2" />`)
            .join('');
        const viewport = this.renderer.getViewport?.();
        const extent = viewport?.extent;
        const reticle = extent
            ? `<rect x="${Math.max(2, mapX(viewport!.center[0] - extent.width / 2)).toFixed(1)}" y="${Math.max(2, mapY(viewport!.center[1] - extent.height / 2)).toFixed(1)}" width="${((extent.width / width) * 144).toFixed(1)}" height="${((extent.height / height) * 84).toFixed(1)}" />`
            : '';
        svg.innerHTML = `<rect class="plate-frame" x="1" y="1" width="158" height="98" />${dots}${reticle}`;
    }

    private renderView(): void {
        el('tasks').toggleAttribute('data-active', this.#viewName === 'tasks');
        el('timeline').toggleAttribute('data-active', this.#viewName === 'timeline');
        for (const button of document.querySelectorAll<HTMLButtonElement>('#view-switch button'))
            button.setAttribute('aria-selected', String(button.dataset['view'] === this.#viewName));
    }

    private renderLegend(): void {
        const statuses: readonly [string, string][] = [
            ['committed · complete', 'ok'],
            ['sleeping · waiting · pending', 'warn'],
            ['running · streaming', 'running'],
            ['failed · aborted', 'error'],
        ];
        el('legend').replaceChildren(
            ...statuses.map(([label, tone]) => {
                const row = document.createElement('div');
                row.className = 'row';
                row.innerHTML = `<span class="label">${escapeHTML(label)}</span><span class="value" data-tone="${tone}">${escapeHTML(tone)}</span>`;
                return row;
            }),
            ...Object.entries(EDGE_LABELS).map(([kind, label]) => {
                const row = document.createElement('div');
                row.className = 'row';
                row.innerHTML = `<span class="label">${escapeHTML(label)}</span><span class="value">${escapeHTML(kind)}</span>`;
                return row;
            }),
        );
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
        for (const event of ['wheel', 'dblclick'] as const)
            el('canvas').addEventListener(event, () => { this.#zoomDriven = true; }, { passive: true });
        for (const button of document.querySelectorAll<HTMLButtonElement>('#view-switch button'))
            button.addEventListener('click', () => this.setView(button.dataset['view'] as ViewName));
        el('help-close').addEventListener('click', () => this.toggleHelp(false));
        el('survey').addEventListener('click', (event) => {
            const bounds = this.#overviewBounds;
            const viewport = this.renderer.getViewport?.();
            if (!bounds || !viewport) return;
            const rect = el('survey').getBoundingClientRect();
            const fx = (event.clientX - rect.left) / rect.width;
            const fy = (event.clientY - rect.top) / rect.height;
            const x = bounds.minX + fx * (bounds.maxX - bounds.minX);
            const y = bounds.minY + fy * (bounds.maxY - bounds.minY);
            this.renderer.setViewport({ zoom: viewport.zoom, center: [x, y, viewport.center[2]] });
        });
        el('survey').addEventListener('keydown', (event) => {
            const bounds = this.#overviewBounds;
            const viewport = this.renderer.getViewport?.();
            if (!bounds || !viewport) return;
            const dx = event.key === 'ArrowRight' ? 0.1 : event.key === 'ArrowLeft' ? -0.1 : 0;
            const dy = event.key === 'ArrowDown' ? 0.1 : event.key === 'ArrowUp' ? -0.1 : 0;
            if (!dx && !dy) return;
            event.preventDefault();
            this.renderer.setViewport({
                zoom: viewport.zoom,
                center: [
                    viewport.center[0] + dx * (bounds.maxX - bounds.minX),
                    viewport.center[1] + dy * (bounds.maxY - bounds.minY),
                    viewport.center[2],
                ],
            });
        });
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
