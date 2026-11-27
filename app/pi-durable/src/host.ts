import { agentDomain } from '@spacegraphjs/agent';
import {
    VocabularyAdapter,
    type AdapterEdge,
    type AdapterModel,
    type AdapterNode,
    type AdapterPosition,
    type BandTemplate,
} from '@spacegraphjs/adapter';
import {
    applyNodeBudget,
    diffKernels,
    Kernel,
    SessionKernel,
    SpatialIndex2D,
} from '@spacegraphjs/kernel';
import {
    createRenderClock,
    DEFAULT_THEME,
    type RenderEdge,
    type RenderModel,
    type RenderNode,
    type RenderTheme,
} from '@spacegraphjs/renderer';
import { rankedSearch } from '@spacegraphjs/search';
import { createAnnouncer } from 'spacegraphjs/a11y';
import type { GraphViewData } from '@spacegraphjs/shared';
import { defaultTokens, themeFromDesignTokens, type DesignTokens } from '@spacegraphjs/shared/tokens';
import { SpaceGraphRenderer } from '@spacegraphjs/spacegraph-renderer';
import { ScopeSimulation, solveNodeAreaDensity, type ScopeSpec } from 'spacegraphjs/layout';
import { Navigation, type MinimapProjection } from 'spacegraphjs/navigation';
import { ScopedOverlay } from 'spacegraphjs/overlays';
import {
    mountReading,
    readingOrder,
    type ReadingController,
    type ReadingNode,
} from 'spacegraphjs/reading';
import { representationChanges } from 'spacegraphjs/representations';
import { applyModelEmphasis, mappingFor } from 'spacegraphjs/salience';
import {
    lineHTML,
    mountTerminalPrompt,
    mountTerminalSink,
    terminalGlyphs,
    terminalGrid,
    terminalLineSize,
    terminalPromptHTML,
    type TerminalController,
    type TerminalLine,
    type TerminalPromptController,
    type TerminalSink,
} from 'spacegraphjs/terminal';
import { isEditableTarget } from 'spacegraphjs/utils';
import { type ScaleSample } from 'spacegraphjs/zoom';
import { decodeAddress, encodeAddress, type Address } from './address';
import { exportURL } from './api';
import { edgeStyleForKind } from './edge-style';
import { attentionWeights, createScaleDomain, sampleForRung } from './attention';
import { calloutsFor, type Callout } from './callouts';
import { chapterCaptions, chapterFrames } from './chapters';
import { digestKernels, type Digest } from './digest';
import { focusLens } from './focus';
import { filterCounts, matchesFilter, type MuteFilter } from './filters';
import { HistoryTracker } from './history';
import { instrumentsFor, tally, type Instruments } from './instruments';
import { LAYOUT_NAMES, lensCompletions, LENS_HELP, parseLens, type LayoutName } from './lens';
import { bandForOctave, octaveFor, octaveSizeFor, sizeForOctave, type OctaveBand } from './octaves';
import { provenanceFor } from './provenance';
import {
    button,
    buildScopes,
    createViewportController,
    dataText,
    DEFAULT_FIT_OPTIONS,
    downloadBlob,
    el,
    escapeHTML,
    row,
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
import { isRung, RUNGS, rungEmphasis, type Rung, type RungSpec } from './rungs';
import { scenarioByID, scenarioOps, VIEW_NAMES, type ViewName } from './scenarios';
import { buildScopeForest } from './scopes';
import { shotById } from './shots';
import { storyByID, type Story } from './stories';
import { threadFrom, type ThreadStep } from './thread';
import { asOfFeed, snapshotsOf } from './time-travel';

/** Zoom is a free camera control, independent of the explicit rung presets. */
const FREE_ZOOM = { min: 0.01, max: 100 } as const;
/** Core layout hint: how much of the surface the node boxes should cover. */
const NODES_AREA_DENSITY = 0.6;
const MAX_NODE_SIZE = 1024;
/** Eased reveal delay per band; reduced motion bypasses the morph entirely. */
const BAND_DELAY: Readonly<Record<string, number>> = {
    dot: 0,
    chip: 0.04,
    card: 0.08,
    panel: 0.12,
    monument: 0.16,
};
const scaledSize = (octave: number, scale: number): readonly [number, number] => {
    const [width, height] = sizeForOctave(octave);
    return [
        Math.min(MAX_NODE_SIZE, Math.round(width * scale)),
        Math.min(MAX_NODE_SIZE, Math.round(height * scale)),
    ];
};

type FlowNode = {
    readonly id: string;
    readonly kind: string;
    readonly width: number;
    readonly height: number;
};
const FLOW_RANK: Readonly<Record<string, number>> = {
    conversation: 0,
    run: 1,
    task: 2,
    boundary: 3,
    message: 4,
    action: 5,
    artifact: 6,
    state: 7,
    config: 8,
    pending: 9,
};
const flowRank = (node: FlowNode): number => FLOW_RANK[node.kind] ?? 10;

/** Serpentine flow along recorded edges: connected facts stay adjacent and no two cards overlap. */
const flowPositions = (
    nodes: readonly FlowNode[],
    edges: readonly { readonly source: string; readonly target: string }[],
): ReadonlyMap<string, { readonly x: number; readonly y: number; readonly z: number }> => {
    const byID = new Map(nodes.map((node) => [node.id, node] as const));
    const next = new Map<string, string[]>();
    for (const edge of edges) {
        const targets = next.get(edge.source) ?? [];
        if (!targets.includes(edge.target)) targets.push(edge.target);
        next.set(edge.source, targets);
    }
    const order: FlowNode[] = [];
    const seen = new Set<string>();
    const visit = (id: string): void => {
        if (seen.has(id)) return;
        seen.add(id);
        const node = byID.get(id);
        if (node) order.push(node);
        for (const target of next.get(id) ?? []) visit(target);
    };
    for (const node of [...nodes].sort((a, b) => flowRank(a) - flowRank(b))) visit(node.id);
    const rowWidth = Math.max(1600, ...nodes.map((node) => node.width * 1.4));
    const gapX = 56;
    const gapY = 112;
    const positions = new Map<string, { x: number; y: number; z: number }>();
    let cursor = 0;
    let rowTop = 0;
    let rowHeight = 0;
    let forward = true;
    for (const node of order) {
        if (cursor > 0 && cursor + node.width > rowWidth) {
            cursor = 0;
            rowTop += rowHeight + gapY;
            rowHeight = 0;
            forward = !forward;
        }
        const left = forward ? cursor : rowWidth - cursor - node.width;
        positions.set(node.id, { x: left + node.width / 2, y: rowTop + node.height / 2, z: 0 });
        cursor += node.width + gapX;
        rowHeight = Math.max(rowHeight, node.height);
    }
    const xs = [...positions.values()].map((point) => point.x);
    const ys = [...positions.values()].map((point) => point.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    return new Map(
        [...positions].map(
            ([id, point]) => [id, { x: point.x - centerX, y: point.y - centerY, z: 0 }] as const,
        ),
    );
};

const DURABLE_TOKENS: DesignTokens = {
    ...defaultTokens,
    colors: {
        ...defaultTokens.colors,
        background: '#0f0e0c',
        card: '#191713',
        muted: '#14120f',
        foreground: '#f2ede3',
        mutedForeground: '#d8c9ad',
        border: '#3a352c',
        accent: '#d7a45f',
        success: '#8fb98a',
        warning: '#e2b169',
        destructive: '#d98379',
        edge: '#6a6254',
        edgeMuted: '#3a352c',
        selection: '#d7a45f',
        ring: '#e2b169',
        canvasText: '#f2ede3',
    },
};

const THEME: RenderTheme = themeFromDesignTokens(DURABLE_TOKENS, {
    defaults: { ...DEFAULT_THEME, fontSize: 15 },
});

type Importance = 'hero' | 'medium' | 'compact';

type DurableNode = AdapterNode & {
    readonly role?: string;
    readonly importance: Importance;
    readonly octave: number;
    readonly band: OctaveBand;
    readonly data?: Readonly<Record<string, unknown>>;
};

const VIEW_LABELS: Readonly<Record<ViewName, string>> = {
    graph: 'facts',
    tasks: 'owners',
    timeline: 'order',
    diff: 'delta',
    trace: 'spans',
    docs: 'documents',
    transcript: 'console',
};

const ATTENTION_MAPPING = mappingFor(['opacity', 'labelDensity'], {
    opacity: [0.78, 1],
    labelDensity: [0.6, 1],
});

const FACT_SAMPLE = sampleForRung(createScaleDomain(), 'fact');

const LAYOUT_STRATEGIES: Readonly<Record<LayoutName, NonNullable<ScopeSpec['strategy']>>> = {
    grid: 'grid',
    radial: 'force',
    timeline: 'tree',
};

const BUDGET_WEIGHTS: Readonly<Record<string, number>> = {
    conversation: 1000,
    run: 900,
    task: 700,
    boundary: 500,
    message: 300,
    action: 100,
    artifact: 50,
    state: 20,
    config: 10,
    pending: 10,
};

const sizeForNode = (node: DurableNode): readonly [number, number] => {
    const size = node.data?.['size'];
    if (
        Array.isArray(size) &&
        size.length === 2 &&
        typeof size[0] === 'number' &&
        typeof size[1] === 'number'
    )
        return [size[0], size[1]];
    return octaveSizeFor(node, FACT_SAMPLE);
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

const TASK_KINDS = new Set(['conversation', 'run', 'task', 'pending']);
const TIMELINE_KINDS = new Set(['conversation', 'run', 'message', 'boundary', 'state', 'action']);
const TRANSCRIPT_KINDS = new Set(['message', 'boundary', 'state', 'action']);
/** Only recorded hierarchy forms a subgraph; order and signal edges never become groups. */
const HIERARCHY = new Set(['contains', 'owns', 'delegates', 'fork', 'forkedFrom']);

type DurableGroup = {
    readonly id: string;
    readonly members: readonly string[];
    readonly counts: Readonly<Record<string, number>>;
};

/** One caption authority for subgraph frames and their member detail at territory. */
const groupDetail = (group: DurableGroup): string =>
    ['task', 'fork']
        .filter((kind) => group.counts[kind]! > 0)
        .map((kind) => `${kind} ${group.counts[kind]}`)
        .join(' · ');

/** Emits recorded subgraphs as frames; the adapter still owns member parenting and counts. */
class DurableAdapter extends VocabularyAdapter<DurableNode> {
    readonly #groups: () => readonly DurableGroup[];
    readonly #active: () => ReadonlySet<string>;

    constructor(
        vocabulary: ConstructorParameters<typeof VocabularyAdapter<DurableNode>>[0],
        config: ConstructorParameters<typeof VocabularyAdapter<DurableNode>>[1],
        groups: () => readonly DurableGroup[],
        active: () => ReadonlySet<string>,
    ) {
        super(vocabulary, config);
        this.#groups = groups;
        this.#active = active;
    }

    override buildBands(
        model: AdapterModel<DurableNode, AdapterEdge>,
        _level: string,
        positions: ReadonlyMap<string, AdapterPosition>,
        renderBand: BandTemplate<DurableNode>,
        visible: ReadonlySet<string>,
    ): RenderNode[] {
        const byID = new Map(model.nodes.map((node) => [node.id, node]));
        const active = this.#active();
        return this.#groups()
            .filter((group) => active.has(group.id))
            .flatMap((group) => {
                const box = this.bandBox(model, group.members, positions, visible);
                const source = byID.get(group.id);
                if (!box || !source) return [];
                const width = Math.round(box.max.x - box.min.x);
                const height = Math.round(box.max.y - box.min.y);
                const frame: DurableNode = {
                    id: `band:${group.id}`,
                    kind: 'band',
                    label: source.label,
                    status: '',
                    importance: 'compact',
                    octave: 0,
                    band: 'chip',
                    data: { members: group.members, counts: groupDetail(group) },
                };
                return [
                    {
                        id: frame.id,
                        kind: 'band',
                        label: frame.label,
                        shape: 'group',
                        position: [(box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, 0],
                        size: [width, height, 0],
                        data: {
                            members: [...group.members],
                            cluster: group.id,
                            counts: groupDetail(group),
                        },
                        html: renderBand(frame, group.members.length, box),
                    },
                ];
            });
    }
}

const NODE_LABELS: Readonly<Record<string, string>> = {
    'pi.usage': 'Usage',
    'pi.agent': 'Agent',
    'pi.provider': 'Provider',
    'pi.live': 'Live state',
    'pi.settings': 'Settings',
    'pi.env': 'Environment',
    'pi.extension': 'Extension',
    'pi.instructions': 'Instructions',
    'pi.error': 'Error',
    'pi.trace': 'Agent events',
    'app.todos': 'Host todos',
};

const EDGE_LABELS: Readonly<Record<string, string>> = {
    orders: 'order',
    owns: 'owns',
    'waiting.on': 'waits on',
    'sleeps-on': 'sleeps on',
    delegates: 'delegates',
    retry: 'retry',
    checkpoint: 'checkpoint',
    fork: 'fork',
    forkedFrom: 'forked from',
};

const short = (value: string, max = 96): string =>
    value.length > max ? `${value.slice(0, max)}…` : value;

type LabelledNode = {
    readonly kind: string;
    readonly label: string;
    readonly status?: string;
    readonly data?: Readonly<Record<string, unknown>>;
};
const labelForNode = (node: LabelledNode): string => {
    if (node.kind === 'task' && node.data?.['kind'] === 'durable.approval')
        return `Approval task ${String(node.data['taskId'] ?? '')}`.trim();
    if (node.kind === 'message' || node.kind === 'action') {
        const tool = node.data?.['toolName'];
        const committed = dataText(node) || (typeof tool === 'string' ? `${tool}()` : '');
        if (committed) return short(committed, 48);
    }
    const known =
        NODE_LABELS[node.label] ??
        Object.entries(NODE_LABELS).find(([key]) => node.label.startsWith(key))?.[1];
    return known ?? node.label;
};

const summaryForNode = (node: DurableNode): string => {
    const parts: string[] = [];
    const text = dataText(node);
    if (text) parts.push(short(text));
    const diff = node.data?.['diff'];
    if (typeof diff === 'string') parts.push(diff);
    const trace = node.data?.['trace'];
    if (typeof trace === 'string') parts.push(`span ${short(trace, 64)}`);
    const role = node.data?.['role'];
    if (typeof role === 'string' && role !== node.kind) parts.push(role);
    if (node.status) parts.push(node.status);
    const signals = node.data?.['signals'];
    if (typeof signals === 'string' && signals) parts.push(`signal: ${signals}`);
    const until = node.data?.['until'];
    if (typeof until === 'number')
        parts.push(`wakes ${new Date(until).toISOString().slice(0, 16)}Z`);
    const toolName = node.data?.['toolName'];
    if (typeof toolName === 'string') parts.push(`tool ${toolName}`);
    if (node.data?.['head'] !== undefined) parts.push(`head ${String(node.data['head'])}`);
    if (node.data?.['deferred'] === true) parts.push('deferred');
    const error = node.data?.['error'];
    if (typeof error === 'string') parts.push(`error ${error}`);
    const recovery = node.data?.['recovery'];
    if (typeof recovery === 'string') parts.push(`recovery ${short(recovery, 56)}`);
    const workshop = node.data?.['workshop'];
    if (typeof workshop === 'string') parts.push(workshop);
    return parts.join(' · ');
};

const NODE_GLYPHS: Readonly<Record<string, string>> = {
    conversation: '▤',
    run: '⟳',
    message: '✎',
    action: '⚒',
    task: '◫',
    boundary: '⌁',
    pending: '⋯',
    artifact: '▧',
    config: '⚙',
    state: '◌',
    band: '▭',
};

const cardTemplate = (node: DurableNode): string => {
    const detail = typeof node.data?.['detail'] === 'string' ? String(node.data['detail']) : '';
    const summary = summaryForNode(node);
    const status = node.status ? `<span class="card-status">${escapeHTML(node.status)}</span>` : '';
    const diff = typeof node.data?.['diff'] === 'string' ? String(node.data['diff']) : '';
    const encoded = node.data?.['image'];
    const image =
        typeof encoded === 'string' && /^[A-Za-z0-9+/=]+$/.test(encoded)
            ? `<img class="card-image" alt="committed image artifact" src="data:image/png;base64,${encoded}" />`
            : '';
    const attention =
        typeof node.data?.['attention'] === 'number' ? node.data['attention'].toFixed(2) : '0.50';
    const workshop = typeof node.data?.['workshop'] === 'string' ? node.data['workshop'] : '';
    const label = labelForNode(node);
    const name = `${label}${summary ? ` — ${summary}` : ''}`;
    const shortLabel = label.split(/\s+/)[0] ?? label;
    const glyph = NODE_GLYPHS[node.kind] ?? '·';
    return `<div class="durable-card ${node.importance} band-${node.band}" tabindex="0" data-kind="${escapeHTML(node.kind)}" data-status="${escapeHTML(node.status)}" data-importance="${node.importance}" data-attention="${attention}" data-octave="${node.octave.toFixed(2)}" data-band="${node.band}"${node.data?.['muted'] ? ' data-muted="true"' : ''}${node.data?.['pulse'] ? ' data-pulse="true"' : ''} aria-label="${escapeHTML(name)}" title="${escapeHTML(name)}"${workshop ? ` data-workshop="${escapeHTML(workshop)}"` : ''}${diff ? ` data-diff="${diff}"` : ''}>${workshop ? `<span class="card-workshop">[${escapeHTML(workshop)}]</span>` : ''}<span class="card-short" aria-hidden="true">${escapeHTML(shortLabel)}</span><span class="card-label"><span class="card-glyph" aria-hidden="true">${glyph}</span>${escapeHTML(label)}${status}</span>${summary ? `<span class="card-summary">${escapeHTML(summary)}</span>` : ''}${detail ? `<span class="card-detail">${escapeHTML(detail)}</span>` : ''}${image}</div>`;
};

/** One committed kernel, different captions per landmark: zoom changes detail, never facts. */
const detailFor = (
    rung: Rung,
    node: ScopeNode,
    counts: ReadonlyMap<string, number>,
    step: number,
    steps: number,
    group: DurableGroup | undefined,
): string => {
    if (rung === 'cosmos') return '';
    if (rung === 'territory') {
        if (!group) return '';
        const detail = groupDetail(group);
        return `in ${group.id.split(':').pop()} · ${group.members.length}${detail ? ` · ${detail}` : ''}`;
    }
    if (rung === 'passage') return step >= 0 ? `step ${step + 1}/${steps}` : '';
    if (rung === 'grain') {
        const data = node.data ?? {};
        return ['doc', 'source', 'head', 'deferred', 'durationMs']
            .filter((key) => data[key] !== undefined)
            .map((key) => `${key} ${String(data[key])}`)
            .join(' · ');
    }
    const members = group?.members.length;
    const kinds = [...counts]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([kind, count]) => `${kind} ×${count}`);
    return [members ? `${members} recorded facts` : '', ...kinds].filter(Boolean).join(' · ');
};

export class DurableHost {
    readonly renderer = new SpaceGraphRenderer();
    readonly viewOps = createViewportController(this.renderer, FREE_ZOOM);
    readonly registry: TabRegistry;
    readonly #announcer = createAnnouncer(el('announcer'));
    #groups: readonly DurableGroup[] = [];
    readonly #adapter = new DurableAdapter(
        {
            cardRoles: [
                'run',
                'message',
                'user',
                'assistant',
                'action',
                'conversation',
                'task',
                'boundary',
                'pending',
                'artifact',
                'config',
                'state',
            ],
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
                band: node.band,
                muted: node.data?.['muted'] === true,
                style: {
                    width: `${sizeForNode(node)[0]}px`,
                    height: `${sizeForNode(node)[1]}px`,
                },
            }),
            extraEdgeData: (edge) => {
                const style = edgeStyleForKind(edge.kind);
                return {
                    label: style.caption
                        ? `${style.glyph} ${EDGE_LABELS[edge.kind] ?? edge.kind}`
                        : undefined,
                    style: style.style,
                    confidence: style.confidence,
                    data: {
                        edgeTone: style.tone,
                        edgeWeight: style.confidence === 'explicit' ? 2 : 1,
                        ...(style.directed ? { arrowhead: 'target' } : {}),
                    },
                };
            },
        },
        {
            bands: true,
            nodeSizeFn: sizeForNode,
            renderCardTemplate: cardTemplate,
            renderBandTemplate: (node, count) => {
                const counts = node.data?.['counts'];
                const detail = typeof counts === 'string' && counts ? ` · ${counts}` : '';
                return `<div class="durable-band" data-group="${escapeHTML(node.id.slice(5))}"><span>${escapeHTML(node.label)} · ${count}${escapeHTML(detail)}</span></div>`;
            },
        },
        () => this.#groups,
        () => this.#activeGroups,
    );
    #status: { readonly provider: string; readonly storage: string; readonly tasks: number } = {
        provider: 'local feed',
        storage: 'fixture',
        tasks: 0,
    };
    #viewName: ViewName = 'graph';
    #rung: Rung = 'fact';
    #layoutName: LayoutName = 'grid';
    #asOf: number | undefined;
    readonly #scale = createScaleDomain();
    get #sample(): ScaleSample {
        return sampleForRung(this.#scale, this.#rung);
    }
    #attention: ReadonlyMap<string, number> = new Map();
    #baseModel: RenderModel | undefined;
    #model: RenderModel | undefined;
    #motionToken = 0;
    #ready = false;
    #offline = false;
    #fitted = false;
    #shot: string | undefined;
    #story: Story | undefined;
    #feedID = '';
    readonly #history = new HistoryTracker();
    #threadHead: string | undefined;
    #thread: readonly ThreadStep[] = [];
    #threadPrior: Address | undefined;
    #focusNeighbours: ReadonlySet<string> | undefined;
    #pinnedID: string | undefined;
    #comparePrior: ViewName | undefined;
    #chapter = -1;
    #filter: MuteFilter = { kinds: [], statuses: [] };
    #pulseID: string | undefined;
    #ticker: readonly string[] = [];
    #callouts: readonly Callout[] = [];
    #seed: string;
    #presented: { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] } = {
        nodes: [],
        edges: [],
    };
    #positions: ReadonlyMap<
        string,
        { readonly x: number; readonly y: number; readonly z: number }
    > = new Map();
    #overviewProjection: MinimapProjection | undefined;
    #omitted = 0;
    #density: { readonly scale: number; readonly measured: number; readonly target: number } = {
        scale: 1,
        measured: 0,
        target: NODES_AREA_DENSITY,
    };
    #readerController: ReadingController | undefined;
    #terminalController: TerminalController | undefined;
    #helpScope: ScopedOverlay | undefined;
    #mutedEdges = 0;
    #activeGroups = new Set<string>();
    #scopeKey = '';
    #scopes: ReturnType<typeof buildScopes> | undefined;
    #laneNames: readonly string[] = [];
    #axisNames: readonly string[] = [];
    #edgeLabels: readonly string[] = [];
    readonly #simulation = new ScopeSimulation({
        instant: true,
        layout: { seed: 7, strategy: 'grid', gap: 300, depthStep: 170, nodePadding: 28 },
    });

    onFork: (() => Promise<boolean>) | undefined;
    onAbort: (() => Promise<boolean>) | undefined;
    onNew: (() => Promise<boolean>) | undefined;
    onScrub: ((seq?: number) => void) | undefined;
    lensHistorySource: (() => readonly string[]) | undefined;

    constructor(
        registry: TabRegistry,
        offline = false,
        shot?: string,
        seed = 'fixed',
        rung?: Rung,
    ) {
        this.registry = registry;
        this.#offline = offline;
        this.#shot = shot;
        this.#seed = seed;
        this.#rung = rung && isRung(rung) ? rung : this.#rung;
    }

    async mount(container: HTMLElement): Promise<void> {
        await this.renderer.mount(container, { theme: THEME, projection: '2d' });
        this.renderer.on('nodeClick', ({ id }) => {
            if (this.#viewName !== 'transcript') this.focus(id);
        });
        this.renderer.on('nodeDoubleClick', ({ id }) => this.toggleFocusLens(id));
        this.renderer.on('viewportChange', ({ zoom, center }) => {
            this.patchView({ camera: { zoom, center } });
            this.regrade();
            this.renderOverview();
        });
        this.renderer.on('bandChange', ({ band }) => this.patchView({ band }));
        this.renderGlossary();
        this.renderLegend();
        this.renderRungs();
        this.bindChrome();
        this.#ready = true;
        this.refresh();
        this.#recordHistory();
        this.viewOps.fit(undefined, DEFAULT_FIT_OPTIONS);
    }

    ready(): boolean {
        return this.#ready;
    }

    offline(): boolean {
        return this.#offline;
    }

    setStatus(status: {
        readonly provider: string;
        readonly storage: string;
        readonly tasks: number;
    }): void {
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
        if (op.op === 'add-node') {
            this.#pulseID = op.node.id;
            this.#ticker = [`${op.node.kind} · ${op.node.label}`, ...this.#ticker].slice(0, 6);
        }
        if (isNew) this.renderTabs();
        if (this.registry.activeID() === conversationID) this.refresh();
    }

    setTab(id: string): boolean {
        if (!this.registry.setActive(id)) return false;
        const view = this.registry.active()?.view;
        if (view?.camera) {
            this.renderer.setViewport({
                zoom: view.camera.zoom,
                center: [...view.camera.center] as [number, number, number],
            });
        } else {
            requestAnimationFrame(() => this.viewOps.fit(undefined, DEFAULT_FIT_OPTIONS));
        }
        if (view?.selection) this.renderer.setSelection([view.selection]);
        this.refresh();
        this.announce(`Switched to conversation ${id}`);
        this.#recordHistory();
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
            octave: 0,
            band: 'card',
            data: node.data,
        };
        const links = kernel.edges
            .filter((edge) => edge.source === id || edge.target === id)
            .map((edge) => EDGE_LABELS[edge.kind] ?? edge.kind);
        const provenance = provenanceFor(tab, id);
        const why = provenance
            ? `<br><br>why is this here?<br>commit ${provenance.sequence} · source ${escapeHTML(provenance.source)}${provenance.at ? ` · at ${new Date(provenance.at).toISOString().slice(0, 16)}Z` : ''}${provenance.predecessor ? `<br>after ${escapeHTML(provenance.predecessor)}` : ''}${provenance.successor ? `<br>before ${escapeHTML(provenance.successor)}` : ''}<br>facet ${escapeHTML(provenance.facets.join(', '))}<br>edges ${escapeHTML(provenance.edgeKinds.join(', '))}`
            : '';
        const label = labelForNode(durable);
        const summary = summaryForNode(durable);
        const status = String(node.data?.['status'] ?? 'committed');
        el('inspector').innerHTML =
            `<strong>${escapeHTML(label)}</strong><br>${escapeHTML(node.kind)} · ${escapeHTML(status)}${summary ? `<br>${escapeHTML(summary)}` : ''}<br><code>${escapeHTML(node.id)}</code>${links.length ? `<br>links: ${escapeHTML([...new Set(links)].join(', '))}` : ''}${why}${provenance ? '<br><button type="button" class="action" id="fork-here" title="Fork at this committed entry (Shift+R)">Fork here</button>' : ''}${TRANSCRIPT_KINDS.has(node.kind) ? '<br><button type="button" class="action" id="read-in-transcript" title="Read this passage in the transcript">Read in transcript</button>' : ''}`;
    }

    reveal(id: string): void {
        this.select(id);
        this.refresh();
        if (this.#viewName === 'docs') this.#readerController?.reveal(id);
        else if (this.#viewName === 'transcript') this.#terminalController?.focusLine(id);
        else this.renderer.focus(id);
        const label = this.#presented.nodes.find((node) => node.id === id)?.label ?? id;
        this.announce(`Revealed ${label}`);
    }

    readInTranscript(id?: string): void {
        const target = id ?? this.registry.active()?.view.focus;
        this.setView('transcript');
        if (target) this.#terminalController?.focusLine(target);
        const label = this.#presented.nodes.find((node) => node.id === target)?.label ?? target;
        this.announce(label ? `Reading passage ${label}` : 'Select a committed entry to read it');
    }

    focus(id: string): void {
        this.select(id);
        this.refresh();
        this.renderer.focus(id);
    }

    patchView(patch: Partial<ViewState>): void {
        const tab = this.registry.active();
        if (tab) this.registry.setView(tab.id, { ...tab.view, ...patch });
    }

    refresh(): void {
        const tab = this.registry.active();
        if (!tab) return;
        const rung = rungEmphasis(this.#rung);
        const full = tabKernel(tab);
        const kernel =
            full.nodes.length > 160
                ? applyNodeBudget(full, {
                      maxNodes: 160,
                      weights: BUDGET_WEIGHTS,
                      protectedIds: tab.view.focus ? [tab.view.focus] : [],
                  })
                : full;
        this.#omitted = full.nodes.length - kernel.nodes.length;
        const presented = this.#presentation(agentDomain.build(kernel), kernel, tab.view.focus);
        this.#groups = this.#groupFrom(kernel);
        const edgeCounts = new Map<string, Map<string, number>>();
        for (const edge of kernel.edges) {
            for (const id of [edge.source, edge.target]) {
                const counts = edgeCounts.get(id) ?? new Map<string, number>();
                counts.set(edge.kind, (counts.get(edge.kind) ?? 0) + 1);
                edgeCounts.set(id, counts);
            }
        }
        const orderIDs = kernel.edges
            .filter((edge) => edge.kind === 'orders')
            .map((edge) => edge.target);
        const groupOf = new Map<string, DurableGroup>();
        for (const group of this.#groups) {
            for (const member of group.members) {
                const current = groupOf.get(member);
                if (!current || group.members.length < current.members.length)
                    groupOf.set(member, group);
            }
        }
        const focus = tab.view.focus;
        const density = solveNodeAreaDensity({
            nodes: presented.nodes.map((node) => {
                const [width, height] = octaveSizeFor(node, this.#sample, focus);
                return { width, height };
            }),
            viewport: {
                width: el('stage').clientWidth || 1600,
                height: el('stage').clientHeight || 900,
            },
            nodesAreaDensity: NODES_AREA_DENSITY,
            maxScale: 16,
        });
        this.#density = {
            scale: density.scale,
            measured: density.measured,
            target: NODES_AREA_DENSITY,
        };
        const positions = this.#layout(presented.nodes, presented.edges);
        const labels = this.#labels(presented, positions);
        this.#presented = presented;
        this.#laneNames = labels.laneLabels.map((lane) => lane.label);
        this.#axisNames = labels.axisLabels.map((axis) => axis.label);
        this.#positions = positions;
        const { weights, octaves, lensed } = this.#attentionFor(focus);
        this.#attention = weights;
        this.#callouts = calloutsFor(
            presented.nodes.map((node) => ({
                kind: node.kind,
                status: String(node.data?.['status'] ?? ''),
                data: node.data,
            })),
        );
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
                        octave: 0,
                        band: 'card',
                        data: {
                            ...node.data,
                            attention: weights.get(node.id) ?? 0,
                            detail: detailFor(
                                this.#rung,
                                node,
                                edgeCounts.get(node.id) ?? new Map(),
                                orderIDs.indexOf(node.id),
                                orderIDs.length,
                                groupOf.get(node.id),
                            ),
                        },
                    };
                    const octave =
                        lensed?.octaves.get(node.id) ??
                        octaves.get(node.id) ??
                        octaveFor(durable, this.#sample, tab.view.focus);
                    const status = String(node.data?.['status'] ?? '');
                    const muted =
                        Boolean(lensed?.muted.has(node.id)) ||
                        rung.mutedNode(node.kind) ||
                        !matchesFilter({ kind: node.kind, status }, this.#filter);
                    const sized: DurableNode = {
                        ...durable,
                        octave,
                        band: bandForOctave(octave),
                        data: {
                            ...durable.data,
                            octave,
                            size: scaledSize(octave, this.#density.scale),
                            muted,
                            pulse: node.id === this.#pulseID,
                        },
                    };
                    return { ...sized, label: labelForNode(sized), summary: summaryForNode(sized) };
                }),
                edges: presented.edges.map((edge) => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    kind: edge.kind,
                })),
            },
            {
                level: 'execution',
                positions,
                focus: tab.view.focus,
                cardBudget: 30,
                bands: true,
                ...labels,
            },
        );
        this.#baseModel = model;
        if (this.#viewName !== 'transcript') this.#setModel(this.#emphasised(model));
        this.#edgeLabels = model.edges.flatMap((edge) => (edge.label ? [edge.label] : []));
        if (!this.#fitted && presented.nodes.length) {
            this.#fitted = true;
            requestAnimationFrame(() => this.viewOps.fit(undefined, DEFAULT_FIT_OPTIONS));
        }
        this.renderTabs();
        this.renderStatus();
        this.renderInsights();
        this.renderTasks(kernel.nodes);
        this.renderTimeline(kernel.nodes, kernel.edges);
        this.renderView();
        this.renderReader(full);
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
        requestAnimationFrame(() => this.viewOps.fit(undefined, DEFAULT_FIT_OPTIONS));
        this.announce(`${name} view`);
        this.#recordHistory();
    }

    setRung(rung: Rung): boolean {
        if (!isRung(rung)) return false;
        if (rung === this.#rung) return false;
        this.#rung = rung;
        this.renderRungs();
        this.#recordHistory();
        if (!this.#ready) return true;
        const viewport = this.renderer.getViewport?.();
        if (viewport && !this.#offline) {
            const zoom = this.#scale.rawAt(
                RUNGS.findIndex((entry) => entry.id === rung) / (RUNGS.length - 1),
            );
            this.renderer.setViewport({ zoom, center: viewport.center });
        }
        this.refresh();
        this.renderOverview();
        this.announce(`${RUNGS.find((entry) => entry.id === rung)!.label} rung`);
        return true;
    }

    setLayout(name: LayoutName): void {
        this.#layoutName = name;
        this.refresh();
        requestAnimationFrame(() => this.viewOps.fit(undefined, DEFAULT_FIT_OPTIONS));
        this.announce(`Layout ${name}`);
        this.#recordHistory();
    }

    zoomBy(factor: number): void {
        this.viewOps.zoomBy(factor);
    }

    resetView(): void {
        this.setRung('fact');
        this.viewOps.fit(undefined, DEFAULT_FIT_OPTIONS);
        this.announce('View reset');
    }

    setFeedID(id: string): void {
        this.#feedID = id;
        this.renderTime();
    }

    #snapshot(): Address {
        const address = this.address();
        return {
            ...address,
            view: address.view ?? 'graph',
            rung: address.rung ?? 'fact',
            layout: address.layout ?? 'grid',
        };
    }

    #recordHistory(): void {
        this.#history.record(this.#snapshot());
    }

    history(): readonly Address[] {
        return this.#history.entries;
    }

    historyIndex(): number {
        return this.#history.index;
    }

    #stepHistory(delta: -1 | 1): boolean {
        const address = this.#history.step(delta);
        if (!address) return false;
        this.applyAddress(address);
        this.announce(`History ${this.#history.index + 1} of ${this.#history.entries.length}`);
        return true;
    }

    historyBack(): boolean {
        return this.#stepHistory(-1);
    }

    historyForward(): boolean {
        return this.#stepHistory(1);
    }

    threadActive(): boolean {
        return this.#thread.length > 0;
    }

    focusLensActive(): boolean {
        return this.#focusNeighbours !== undefined;
    }

    followThread(id: string): readonly ThreadStep[] {
        const tab = this.registry.active();
        const steps = tab ? threadFrom(tabKernel(tab), id) : [];
        this.#threadPrior = this.#snapshot();
        this.#threadHead = steps.length ? id : undefined;
        this.#thread = steps;
        if (steps.length) {
            this.focus(id);
            this.announce(`Following ${steps.length} committed steps`);
        } else this.announce('No recorded thread from this node');
        this.renderInsights();
        return steps;
    }

    nextThreadStep(): boolean {
        if (!this.#thread.length || !this.#threadHead) return false;
        const current = this.registry.active()?.view.focus ?? this.#threadHead;
        const index = this.#thread.findIndex((step) => step.id === current);
        const next = this.#thread[(index + 1) % this.#thread.length]!;
        this.focus(next.id);
        this.announce(`Thread step via ${next.kind}`);
        return true;
    }

    exitThread(): boolean {
        if (!this.#thread.length) return false;
        this.#thread = [];
        this.#threadHead = undefined;
        const prior = this.#threadPrior;
        this.#threadPrior = undefined;
        if (prior) this.applyAddress(prior);
        this.announce('Thread closed');
        this.renderInsights();
        return true;
    }

    toggleFocusLens(id?: string): boolean {
        const target = id ?? this.registry.active()?.view.focus;
        if (!target) {
            this.announce('Select a node to focus its neighbourhood');
            return false;
        }
        if (this.#focusNeighbours?.has(target)) return this.exitFocusLens();
        const tab = this.registry.active();
        const kernel = tab ? tabKernel(tab) : new Kernel();
        const neighbours = new Set([target]);
        for (const edge of kernel.edges) {
            if (edge.source === target) neighbours.add(edge.target);
            if (edge.target === target) neighbours.add(edge.source);
        }
        this.#focusNeighbours = neighbours;
        this.select(target);
        this.refresh();
        this.announce(`Focus lens: ${neighbours.size} related facts`);
        return true;
    }

    exitFocusLens(): boolean {
        if (!this.#focusNeighbours) return false;
        this.#focusNeighbours = undefined;
        this.refresh();
        this.announce('Focus restored');
        return true;
    }

    filterCounts() {
        return filterCounts(
            this.#presented.nodes.map((node) => ({
                kind: node.kind,
                status: String(node.data?.['status'] ?? ''),
            })),
            this.#filter,
        );
    }

    setFilter(group: 'kind' | 'status', value: string): boolean {
        const key = group === 'kind' ? 'kinds' : 'statuses';
        const current = this.#filter[key];
        const next = current.includes(value)
            ? current.filter((item) => item !== value)
            : [...current, value];
        this.#filter = { ...this.#filter, [key]: next };
        this.refresh();
        this.announce(`${group} filter ${next.includes(value) ? 'set' : 'cleared'}: ${value}`);
        return true;
    }

    resetFilters(): boolean {
        if (!this.#filter.kinds.length && !this.#filter.statuses.length) return false;
        this.#filter = { kinds: [], statuses: [] };
        this.refresh();
        this.announce('Filters reset');
        return true;
    }

    pinCompare(id?: string): boolean {
        const tabs = this.registry.list();
        const target = id
            ? (this.registry.get(id)?.id ??
              tabs.find((tab) => tabKernel(tab).nodes.some((node) => node.id === id))?.id)
            : tabs.find((tab) => tab.id !== this.registry.activeID())?.id;
        if (!target) {
            this.announce('Open a second conversation to compare');
            return false;
        }
        this.#pinnedID = target;
        this.#comparePrior ??= this.#viewName;
        if (this.#viewName === 'diff') this.refresh();
        else this.setView('diff');
        this.announce(`Pinned ${target} for comparison`);
        return true;
    }

    clearCompare(): boolean {
        if (!this.#pinnedID) return false;
        this.#pinnedID = undefined;
        const prior = this.#comparePrior ?? 'graph';
        this.#comparePrior = undefined;
        if (this.#viewName === prior) this.refresh();
        else this.setView(prior);
        this.announce('Comparison cleared');
        return true;
    }

    routeStep(delta: number): boolean {
        const count = chapterFrames(this.#story?.id).length;
        if (!count) return false;
        const next = Math.max(
            0,
            Math.min(count - 1, (this.#chapter < 0 ? 0 : this.#chapter) + delta),
        );
        void this.scrub(next);
        return true;
    }

    scrubTo(seq?: number): boolean {
        if (!this.onScrub) return false;
        this.onScrub(seq);
        this.setAsOf(seq);
        this.announce(
            seq === undefined ? 'Returned to present' : `Read-only view as of entry ${seq}`,
        );
        return true;
    }

    digest(): Digest | undefined {
        const tab = this.registry.active();
        const scenario = scenarioByID(this.#feedID);
        if (!tab || !scenario) return undefined;
        const snapshots = snapshotsOf(scenario);
        const current = Math.min(this.#asOf ?? snapshots.length, snapshots.length);
        if (current <= 1) return undefined;
        const baseline = snapshots.find((snapshot) => snapshot.seq === current - 1)!;
        const before = new SessionKernel({
            entries: scenarioOps({ ...scenario, view: baseline.view }).map((op, index) => ({
                id: `base-${index}`,
                op,
            })),
        }).state();
        return digestKernels(before, tabKernel(tab), current - 1);
    }

    instruments(): Instruments {
        const focus = this.registry.active()?.view.focus;
        return instrumentsFor({
            bands: this.#presented.nodes.map((node) =>
                bandForOctave(octaveFor(node, this.#sample, focus)),
            ),
            weights: Object.fromEntries(this.#attention),
            edgeKinds: this.#presented.edges.map((edge) => edge.kind),
            omitted: this.#omitted,
        });
    }

    refreshInsights(): void {
        this.renderInsights();
    }

    private renderInsights(): void {
        this.renderTime();
        this.renderRoute();
        this.renderCompare();
        this.renderThread();
        if (el('app').dataset['drawerOpen'] !== 'insights') return;
        this.renderDigest();
        if (el('app').dataset['instruments'] === 'true') this.renderInstruments();
        this.renderCallouts();
        this.renderFilters();
        this.renderTicker();
    }

    private renderRoute(): void {
        const caption =
            this.#chapter >= 0 ? chapterCaptions(this.#story?.id)[this.#chapter] : undefined;
        el('route-caption').textContent = caption ?? '';
    }

    private renderCompare(): void {
        el('compare-status').textContent = this.#pinnedID
            ? `Reference: ${this.#pinnedID}`
            : 'No reference pinned';
    }

    private renderThread(): void {
        const steps = this.#thread;
        el('thread-status').textContent = steps.length
            ? `${this.#threadHead} → ${steps.length} steps · ${[...new Set(steps.map((step) => step.kind))].join(', ')}`
            : 'No active thread';
    }

    private renderCallouts(): void {
        el('callouts').replaceChildren(
            ...this.#callouts.map((callout) => {
                const element = button(
                    `${callout.count} ${callout.label}`,
                    () => {
                        this.setView(callout.view);
                        this.announce(`${callout.count} ${callout.label}`);
                    },
                    { className: 'action' },
                );
                element.setAttribute(
                    'aria-label',
                    `${callout.count} ${callout.label} — open ${callout.view}`,
                );
                return element;
            }),
        );
    }

    private renderFilters(): void {
        const groups = [
            ['kind', [...new Set(this.#presented.nodes.map((node) => node.kind))]] as const,
            [
                'status',
                [
                    ...new Set(
                        this.#presented.nodes.map((node) => String(node.data?.['status'] ?? '')),
                    ),
                ],
            ] as const,
        ];
        for (const [group, values] of groups) {
            const key = group === 'kind' ? 'kinds' : 'statuses';
            el(group === 'kind' ? 'filter-kinds' : 'filter-statuses').replaceChildren(
                ...values.filter(Boolean).map((value) => {
                    const element = button(value, () => this.setFilter(group, value), {
                        className: 'filter-chip',
                    });
                    element.setAttribute('aria-pressed', String(this.#filter[key].includes(value)));
                    return element;
                }),
            );
        }
        const counts = this.filterCounts();
        el('filter-count').textContent = `${counts.matching} / ${counts.total} in fold`;
    }

    private renderTicker(): void {
        el('commit-ticker').textContent = this.#ticker.length
            ? this.#ticker.join(' · ')
            : 'No new commits in this session';
    }

    private renderTime(): void {
        const scenario = scenarioByID(this.#feedID);
        const snapshots = scenario ? snapshotsOf(scenario) : [];
        const slider = el<HTMLInputElement>('time-scrub');
        slider.min = '1';
        slider.max = String(Math.max(1, snapshots.length));
        slider.value = String(
            Math.max(1, Math.min(this.#asOf ?? snapshots.length, snapshots.length)),
        );
        slider.disabled = snapshots.length === 0;
        el('time-ticks').replaceChildren(
            ...snapshots.map((snapshot) => {
                const option = document.createElement('option');
                option.value = String(snapshot.seq);
                option.label = String(snapshot.seq);
                return option;
            }),
        );
        el('time-badge').textContent =
            this.#asOf === undefined ? 'present' : `as of ${this.#asOf} / ${snapshots.length}`;
    }

    private renderDigest(): void {
        const digest = this.digest();
        el('digest').textContent = digest?.summary ?? 'No committed history to compare.';
    }

    private renderInstruments(): void {
        const panel = this.instruments();
        const rows: readonly (readonly [string, string])[] = [
            ...Object.entries(panel.octaves).map(
                ([band, count]) => [`band ${band}`, String(count)] as const,
            ),
            ...Object.entries(panel.edgeKinds).map(
                ([kind, count]) => [`edge ${kind}`, String(count)] as const,
            ),
            ['omitted', String(panel.omitted)] as const,
            ...Object.entries(panel.weights).map(
                ([id, weight]) => [id, weight.toFixed(2)] as const,
            ),
        ];
        el('instruments').replaceChildren(...rows.map(([label, value]) => row(label, value)));
    }

    regrade(): void {
        if (!this.#baseModel || this.#viewName === 'transcript') return;
        this.#attention = this.#attentionFor(this.registry.active()?.view.focus).weights;
        this.#setModel(this.#emphasised(this.#baseModel), false);
    }
    /** One attention computation: focus, nearby boost and lens all use the same positions. */
    #attentionFor(focus: string | undefined): {
        weights: ReadonlyMap<string, number>;
        octaves: ReadonlyMap<string, number>;
        lensed: ReturnType<typeof focusLens> | undefined;
    } {
        const base = attentionWeights(this.#presented.nodes, this.#sample, focus);
        const anchor = focus ? this.#positions.get(focus) : undefined;
        const index = new SpatialIndex2D(
            [...this.#positions].map(([id, point]) => ({ id, x: point.x, y: point.y })),
        );
        const nearby = anchor ? new Set(index.near(anchor.x, anchor.y, 600)) : new Set<string>();
        const weights = new Map(
            [...base].map(
                ([id, weight]) =>
                    [id, nearby.has(id) ? Math.min(1, weight + 0.08) : weight] as const,
            ),
        );
        const octaves = new Map(
            this.#presented.nodes.map(
                (node) => [node.id, octaveFor(node, this.#sample, focus)] as const,
            ),
        );
        const lensed = this.#focusNeighbours
            ? focusLens(octaves, weights, this.#focusNeighbours)
            : undefined;
        return { weights: lensed?.weights ?? weights, octaves, lensed };
    }

    /** Attention and rung muting share one model pass; neither removes a node or an edge. */
    #emphasised(model: RenderModel): RenderModel {
        const emphasised = applyModelEmphasis(model, this.#attention, ATTENTION_MAPPING);
        const rung = rungEmphasis(this.#rung);
        const edges = emphasised.edges.map((edge: RenderEdge) =>
            rung.mutedEdge(edge.kind)
                ? { ...edge, emphasis: 0, data: { ...edge.data, muted: true, opacity: 0.2 } }
                : edge,
        );
        this.#mutedEdges = edges.filter((edge: RenderEdge) => edge.data?.['muted'] === true).length;
        return { ...emphasised, edges };
    }

    /** Morph positions between placements; reduced motion and pure shots cut instantly. */
    #setModel(model: RenderModel, morph = true): void {
        const previous = this.#model;
        const token = ++this.#motionToken;
        this.#model = model;
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const previousByID = new Map(previous?.nodes.map((node) => [node.id, node]) ?? []);
        const modelByID = new Map(model.nodes.map((node) => [node.id, node]));
        const moves =
            previous && morph && !reduced && !this.#offline
                ? model.nodes.flatMap((node) => {
                      const before = previousByID.get(node.id);
                      if (
                          !before ||
                          before.position.every((value, index) => value === node.position[index])
                      )
                          return [];
                      return [{ id: node.id, from: before.position, to: node.position }];
                  })
                : [];
        if (!moves.length) {
            this.renderer.setModel(model);
            return;
        }
        const changes = representationChanges(
            new Map(previous!.nodes.map((node) => [node.id, String(node.emphasis ?? 0)])),
            new Map(model.nodes.map((node) => [node.id, String(node.emphasis ?? 0)])),
            this.#sample,
        );
        const delays = new Map(
            moves.map(
                (move) =>
                    [
                        move.id,
                        BAND_DELAY[String(modelByID.get(move.id)?.data?.['band'] ?? 'card')] ?? 0,
                    ] as const,
            ),
        );
        const maxDelay = Math.max(0, ...delays.values());
        const duration =
            Math.max(0.12, ...changes.map((change) => change.duration)) * (1 + maxDelay);
        const clocks = new Map(
            moves.map((move) => [move.id, createRenderClock(model, [move])] as const),
        );
        const indexByID = new Map(model.nodes.map((node, index) => [node.id, index] as const));
        const start = performance.now();
        const step = (now: number): void => {
            if (token !== this.#motionToken) return;
            const progress = Math.min(1, (now - start) / (duration * 1000));
            const staggered = model.nodes.map((node) => {
                const clock = clocks.get(node.id);
                if (!clock) return node;
                const delay = delays.get(node.id) ?? 0;
                const local = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
                return clock.advance(local).nodes[indexByID.get(node.id) ?? -1] ?? node;
            });
            this.renderer.setModel({ ...model, nodes: staggered });
            if (progress < 1) requestAnimationFrame(step);
            else this.renderer.setModel(model);
        };
        requestAnimationFrame(step);
    }

    announce(message: string): void {
        this.#announcer.announce(message);
    }

    setAsOf(seq?: number): void {
        this.#asOf = seq;
        const badge = el('asof-badge');
        if (seq === undefined) {
            el('app').removeAttribute('data-asof');
            badge.hidden = true;
        } else {
            el('app').dataset['asof'] = String(seq);
            badge.textContent = `as of ${seq}`;
            badge.hidden = false;
            el('readonly-message').textContent =
                `Viewing entry ${seq} (read-only) — prompt and actions are hidden. Return to present to use them.`;
        }
        this.renderInsights();
        this.#recordHistory();
    }

    /** One command line steers view, landmark, time, tab, layout and node lookup. */
    lens(query: string): boolean {
        const command = parseLens(query);
        if (!command) {
            this.announce(`Unknown Lens command: ${query}`);
            return false;
        }
        if (command.kind === 'view') this.setView(command.value);
        if (command.kind === 'rung') this.setRung(command.value);
        if (command.kind === 'asOf') this.setAsOf(command.value);
        if (command.kind === 'tab') return this.setTab(command.value);
        if (command.kind === 'layout') this.setLayout(command.value);
        if (command.kind === 'focus') this.reveal(command.value);
        if (command.kind === 'why') {
            const tab = this.registry.active();
            const id = tab?.view.selection;
            const provenance = tab && id ? provenanceFor(tab, id) : undefined;
            this.announce(
                provenance
                    ? `${id} came from commit ${provenance.sequence} via ${provenance.source}`
                    : 'Select a node to ask why it is here',
            );
            return true;
        }
        if (command.kind === 'help') this.toggleHelp(true);
        if (command.kind === 'find') {
            const model: GraphViewData = {
                nodes: this.#presented.nodes.map((node) => ({
                    id: node.id,
                    label: `${labelForNode({
                        kind: node.kind,
                        label: node.label ?? node.id,
                        status: String(node.data?.['status'] ?? ''),
                        data: node.data,
                    })} ${dataText(node)}`,
                    kind: node.kind,
                    status: String(node.data?.['status'] ?? ''),
                    data: node.data,
                })),
                edges: this.#presented.edges.map((edge) => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    kind: edge.kind,
                })),
            };
            const matches = rankedSearch(model, command.value)
                .filter(
                    (node) =>
                        (!command.status ||
                            String(node.data?.['status'] ?? '') === command.status) &&
                        (!command.nodeKind || node.kind === command.nodeKind),
                )
                .sort((a, b) => a.id.localeCompare(b.id));
            const [hit] = matches;
            if (!hit) {
                this.announce(`No committed node matches ${command.value}`);
                return false;
            }
            this.reveal(hit.id);
        }
        this.announce(`Lens ${query}`);
        this.#recordHistory();
        return true;
    }

    applyShot(id: string): void {
        this.#shot = id;
        const rail = shotById(id)?.rail ?? 'graph';
        this.setView(VIEW_NAMES.includes(rail) ? rail : 'graph');
        this.announce(`Shot ${id}`);
    }

    loadShot(id: string, options?: { readonly replay?: boolean; readonly asOf?: number }): boolean {
        const feed = options?.replay
            ? replayFeed(id, this.#seed)
            : options?.asOf !== undefined
              ? asOfFeed(id, options.asOf)
              : localFeed(undefined, this.#seed, id);
        this.loadFeed(feed);
        this.setAsOf(options?.asOf);
        this.applyShot(id);
        return true;
    }

    setStory(id: string): boolean {
        const story = storyByID(id);
        if (!story) return false;
        this.#story = story;
        return true;
    }

    async scrub(index: number): Promise<boolean> {
        const frame = this.#story?.frames[index];
        if (!frame) return false;
        if ('shot' in frame) {
            if (frame.observer) {
                this.announce('Observer chapters need a read-only stream — open ?observer=1');
                return false;
            }
            this.loadShot(frame.shot, { replay: Boolean(frame.replayId), asOf: frame.asOf });
        } else if (frame.action === 'prompt') {
            const input = el<HTMLInputElement>('prompt-input');
            input.value = frame.value ?? '';
            el<HTMLFormElement>('prompt-form').requestSubmit();
        } else if (frame.action === 'approve') {
            el<HTMLButtonElement>('approve-button').click();
        } else if (frame.action === 'setView') {
            this.setView(frame.value as ViewName);
        } else if (frame.action === 'setTab') {
            this.setTab(frame.value ?? '');
        } else {
            this.reveal(frame.value ?? '');
        }
        this.#chapter = index;
        const caption = `Chapter ${index + 1}: ${frame.caption}`;
        el('inspector').insertAdjacentHTML('beforeend', `<br>route: ${escapeHTML(caption)}`);
        this.renderRoute();
        this.announce(caption);
        return true;
    }

    permalink(): string {
        const tab = this.registry.active();
        const params = new URLSearchParams({ s: tab?.id ?? '' });
        if (this.#shot) params.set('shot', this.#shot);
        if (this.#viewName !== 'graph') params.set('view', this.#viewName);
        if (this.#rung !== 'fact') params.set('rung', this.#rung);
        if (this.#layoutName !== 'grid') params.set('layout', this.#layoutName);
        if (this.#asOf !== undefined) params.set('asOf', String(this.#asOf));
        if (this.#seed !== 'fixed') params.set('seed', this.#seed);
        if (tab?.view.focus) params.set('focus', tab.view.focus);
        const viewport = this.renderer.getViewport?.();
        if (viewport) params.set('zoom', viewport.zoom.toFixed(3));
        return `${location.pathname}?${params.toString()}`;
    }

    applyPermalink(value: string): boolean {
        const params = new URLSearchParams(value.includes('?') ? value.split('?')[1] : value);
        const view = params.get('view');
        const rung = params.get('rung');
        const layout = params.get('layout');
        const asOf = Number(params.get('asOf'));
        const zoom = Number(params.get('zoom'));
        return this.applyAddress({
            s: params.get('s') ?? undefined,
            shot: params.get('shot') ?? undefined,
            view: view && VIEW_NAMES.includes(view as ViewName) ? (view as ViewName) : undefined,
            rung: rung && isRung(rung) ? rung : undefined,
            layout:
                layout && LAYOUT_NAMES.includes(layout as LayoutName)
                    ? (layout as LayoutName)
                    : undefined,
            asOf: params.has('asOf') && Number.isFinite(asOf) ? asOf : undefined,
            zoom: params.has('zoom') && Number.isFinite(zoom) ? zoom : undefined,
            focus: params.get('focus') ?? undefined,
        });
    }

    address(): Address {
        const viewport = this.renderer.getViewport?.();
        return {
            s: this.registry.activeID() || undefined,
            shot: this.#shot,
            view: this.#viewName === 'graph' ? undefined : this.#viewName,
            rung: this.#rung === 'fact' ? undefined : this.#rung,
            layout: this.#layoutName === 'grid' ? undefined : this.#layoutName,
            asOf: this.#asOf,
            zoom: viewport?.zoom,
            focus: this.registry.active()?.view.focus,
        };
    }

    applyAddress(address: Address): boolean {
        this.#history.suppress(true);
        if (address.shot) this.applyShot(address.shot);
        if (address.view) this.setView(address.view);
        if (address.rung) this.setRung(address.rung);
        if (address.layout) this.setLayout(address.layout);
        if (address.asOf !== this.#asOf) this.setAsOf(address.asOf);
        if (address.zoom !== undefined && address.zoom > 0) {
            const viewport = this.renderer.getViewport?.();
            if (viewport)
                this.renderer.setViewport({ zoom: address.zoom, center: viewport.center });
        }
        const tabID = address.s;
        const tabApplied =
            tabID !== undefined && this.registry.get(tabID) !== undefined && this.setTab(tabID);
        if (address.focus) this.reveal(address.focus);
        else {
            this.patchView({ focus: undefined, selection: undefined });
            this.renderer.setSelection([]);
        }
        this.#history.suppress(false);
        return tabApplied || Boolean(address.focus);
    }

    compactAddress(): string {
        return `?at=${encodeAddress(this.address())}`;
    }

    hooks(): Record<string, unknown> {
        return {
            ready: () => this.#ready,
            ops: () => this.opsCount,
            sessions: () => this.registry.list().map((tab) => tab.id),
            activeTab: () => this.registry.activeID(),
            setTab: (id: string) => this.setTab(id),
            reveal: (id: string) => this.reveal(id),
            readInTranscript: (id?: string) => this.readInTranscript(id),
            focus: (id: string) => this.focus(id),
            applyShot: (id: string) => this.applyShot(id),
            setAsOf: (seq?: number) => this.setAsOf(seq),
            loadShot: (
                id: string,
                options?: { readonly replay?: boolean; readonly asOf?: number },
            ) => this.loadShot(id, options),
            setStory: (id: string) => this.setStory(id),
            chapters: () => chapterCaptions(this.#story?.id),
            chapterFrames: () =>
                chapterFrames(this.#story?.id).map((frame) =>
                    'shot' in frame
                        ? { caption: frame.caption, shot: frame.shot }
                        : { caption: frame.caption, action: frame.action },
                ),
            scrub: (index: number) => this.scrub(index),
            permalink: () => this.permalink(),
            applyPermalink: (value: string) => this.applyPermalink(value),
            address: () => this.address(),
            compactAddress: () => this.compactAddress(),
            applyAddress: (value: string) => this.applyAddress(decodeAddress(value) ?? {}),
            trail: () =>
                RUNGS.slice(0, RUNGS.findIndex((entry) => entry.id === this.#rung) + 1).map(
                    (entry) => entry.id,
                ),
            lens: (query: string) => this.lens(query),
            lensHelp: () => LENS_HELP,
            lensCompletions: (prefix: string) => lensCompletions(prefix),
            lensHistory: () => this.lensHistorySource?.() ?? [],
            history: () => this.#history.entries,
            historyIndex: () => this.#history.index,
            historyBack: () => this.historyBack(),
            historyForward: () => this.historyForward(),
            setFeedID: (id: string) => this.setFeedID(id),
            scrubTo: (seq?: number) => this.scrubTo(seq),
            digest: () => this.digest(),
            instruments: () => this.instruments(),
            density: () => ({ ...this.#density }),
            emphasis: () => ({
                rung: this.#rung,
                mutedNodes:
                    this.#model?.nodes.filter((node) => node.data?.['muted'] === true).length ?? 0,
                mutedEdges: this.#mutedEdges,
                activeGroups: [...this.#activeGroups],
            }),
            thread: () => this.#thread,
            threadIDs: () =>
                this.#threadHead ? [this.#threadHead, ...this.#thread.map((step) => step.id)] : [],
            threadActive: () => this.threadActive(),
            followThread: (id: string) => this.followThread(id),
            nextThreadStep: () => this.nextThreadStep(),
            exitThread: () => this.exitThread(),
            focusLensActive: () => this.focusLensActive(),
            toggleFocusLens: (id?: string) => this.toggleFocusLens(id),
            exitFocusLens: () => this.exitFocusLens(),
            callouts: () => this.#callouts,
            filters: () => ({ filter: this.#filter, counts: this.filterCounts() }),
            setFilter: (group: 'kind' | 'status', value: string) => this.setFilter(group, value),
            resetFilters: () => this.resetFilters(),
            pinned: () => this.#pinnedID ?? null,
            pinCompare: (id?: string) => this.pinCompare(id),
            clearCompare: () => this.clearCompare(),
            ticker: () => this.#ticker,
            refreshInsights: () => this.renderInsights(),
            chapterIndex: () => this.#chapter,
            routeStep: (delta: number) => this.routeStep(delta),
            attention: () => ({
                stop: this.#sample.stop,
                position: this.#sample.position,
                importance: this.#sample.importance,
                weights: Object.fromEntries(this.#attention),
            }),
            layoutName: () => this.#layoutName,
            setLayout: (name: string) => {
                if (!LAYOUT_NAMES.includes(name as LayoutName)) return false;
                this.setLayout(name as LayoutName);
                return true;
            },
            export: (format: string) => this.export(format),
            health: () => ({ ...this.#status, offline: this.#offline }),
            abort: () => this.abort(),
            forkAt: (id?: string) => this.forkAt(id),
            newConversation: () => this.newConversation(),
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
            resetView: () => this.resetView(),
            setView: (name: string) => {
                if (!VIEW_NAMES.includes(name as ViewName)) return false;
                this.setView(name as ViewName);
                return true;
            },
            representation: () => {
                const focus = this.registry.active()?.view.focus;
                const octaves = this.#presented.nodes.map((node) =>
                    octaveFor(node, this.#sample, focus),
                );
                return {
                    view: this.#viewName,
                    nodes: this.#presented.nodes.length,
                    nodeIDs: this.#presented.nodes.map((node) => node.id),
                    edgeIDs: this.#presented.edges.map((edge) => edge.id),
                    omitted: this.#omitted,
                    edgeKinds: this.#presented.edges.map((edge) => edge.kind),
                    edgeLabels: [...this.#edgeLabels],
                    laneLabels: [...this.#laneNames],
                    axisLabels: [...this.#axisNames],
                    importance: tally(
                        this.#presented.nodes.map((node) => this.#importanceOf(node)),
                    ),
                    octaves: Object.fromEntries(
                        this.#presented.nodes.map((node, index) => [
                            node.id,
                            Number(octaves[index]!.toFixed(2)),
                        ]),
                    ),
                    bands: tally(octaves.map(bandForOctave)),
                };
            },
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

    vision(): {
        readonly score: number;
        readonly nodes: number;
        readonly edges: number;
        readonly canvas: boolean;
    } {
        const canvas = Boolean(el('canvas').querySelector('canvas'));
        const cards = el('canvas').querySelectorAll('[data-kind]').length;
        const score =
            canvas && this.opsCount > 0 ? Math.min(1, 0.5 + cards / 40 + this.opsCount / 100) : 0;
        return { score, nodes: this.opsCount, edges: this.#baseModel?.edges.length ?? 0, canvas };
    }

    async abort(): Promise<boolean> {
        return this.#callAction(this.onAbort, 'Nothing to cancel');
    }

    async forkAt(id?: string): Promise<boolean> {
        if (!this.#ready) return false;
        if (id) this.reveal(id);
        return this.#callAction(this.onFork, 'Fork is unavailable');
    }

    async newConversation(): Promise<boolean> {
        return this.#callAction(this.onNew, 'New conversation is unavailable');
    }

    async #callAction(
        handler: (() => Promise<boolean>) | undefined,
        unavailable: string,
    ): Promise<boolean> {
        if (!this.#ready) return false;
        if (!handler) {
            this.announce(unavailable);
            return false;
        }
        return handler();
    }

    export(format: string): void {
        const tab = this.registry.active();
        if (!tab) return;
        if (this.#offline) {
            const blob = new Blob(
                [JSON.stringify({ tab: tab.id, view: tab.view, shot: this.#shot })],
                {
                    type: 'application/json',
                },
            );
            downloadBlob(
                blob,
                `conversation-${tab.id}.${format === 'json' ? 'json' : format === 'session' ? 'session.json' : format === 'svg' ? 'svg' : 'md'}`,
            );
            return;
        }
        location.assign(exportURL(format, tab.id));
    }

    /** One position authority: kit scopes define targets; the simulation owns the current frame. */
    #layout(
        nodes: readonly ScopeNode[],
        edges: readonly ScopeEdge[],
    ): ReadonlyMap<string, { readonly x: number; readonly y: number; readonly z: number }> {
        const ids = new Set(nodes.map((node) => node.id));
        const placed = edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
        const contains: ScopeEdge[] = placed
            .filter((edge) => HIERARCHY.has(edge.kind))
            .map((edge, index) => ({
                id: `contains-${index}`,
                source: edge.source,
                target: edge.target,
                kind: 'contains',
            }));
        const focus = this.registry.active()?.view.focus;
        const octaves = nodes.map((node) => octaveFor(node, this.#sample, focus));
        const buckets = octaves.map(bandForOctave).join(',');
        const key = `${this.#layoutName}|${buckets}|${this.#density.scale.toFixed(2)}|${nodes.map((node) => node.id).join(',')}|${placed.map((edge) => edge.id).join(',')}`;
        if (key !== this.#scopeKey || !this.#scopes) {
            this.#scopes = buildScopes(nodes, contains, 300);
            this.#scopeKey = key;
        }
        const sizes = octaves.map((octave) => scaledSize(octave, this.#density.scale));
        const forest = buildScopeForest(
            nodes.map((node, index) => ({
                id: node.id,
                lane: this.#viewName,
                row: index,
                size: sizes[index]!,
            })),
            placed,
            this.#groups,
            LAYOUT_STRATEGIES[this.#layoutName],
        );
        this.#simulation.setSpecs(forest.specs);
        const positions = flowPositions(
            nodes.map((node, index) => ({
                id: node.id,
                kind: node.kind,
                width: sizes[index]![0],
                height: sizes[index]![1],
            })),
            placed,
        );
        const targets = new Map(
            [...positions].flatMap(([id, position]) => {
                const qualified = forest.nodePaths.get(id);
                return qualified ? [[qualified, position] as const] : [];
            }),
        );
        this.#simulation.setLayoutTargets(targets);
        this.#simulation.setPolicy({
            band: RUNGS.findIndex((entry) => entry.id === this.#rung),
            focus: focus ? forest.nodePaths.get(focus) : undefined,
        });
        this.#simulation.settle();
        const view = this.#simulation.view();
        this.#activeGroups = new Set(
            [...forest.groupPaths]
                .filter(([, path]) => view.frames.get(path)?.active)
                .map(([id]) => id),
        );
        return new Map(
            [...view.positions].flatMap(([qualified, position]) => {
                const id = forest.nodesByPath.get(qualified);
                return id ? [[id, position] as const] : [];
            }),
        );
    }

    /** Subgraphs come only from recorded edges: owners, waits and ordered threads. */
    #groupFrom(kernel: Kernel): readonly DurableGroup[] {
        const membersOf = new Map<string, Set<string>>();
        const add = (id: string, ids: readonly string[]): void => {
            const members = membersOf.get(id) ?? new Set<string>();
            for (const member of ids) members.add(member);
            membersOf.set(id, members);
        };
        for (const edge of kernel.edges) {
            if (HIERARCHY.has(edge.kind) || edge.kind === 'sleeps-on' || edge.kind === 'waiting.on')
                add(edge.source, [edge.source, edge.target]);
        }
        const order = kernel.edges.filter(
            (edge) => edge.kind === 'orders' || edge.kind === 'checkpoint',
        );
        for (const node of kernel.nodes.filter((entry) => entry.kind === 'conversation')) {
            const members = new Set<string>([node.id]);
            const queue = [node.id];
            while (queue.length) {
                const from = queue.pop()!;
                for (const edge of order) {
                    if (edge.source !== from || members.has(edge.target)) continue;
                    members.add(edge.target);
                    queue.push(edge.target);
                }
            }
            if (members.size > 1) add(node.id, [...members]);
        }
        const kinds = new Map(kernel.nodes.map((node) => [node.id, node.kind] as const));
        const forks = new Set(
            kernel.edges.filter((edge) => edge.kind === 'fork').map((edge) => edge.source),
        );
        return [...membersOf]
            .filter(([, members]) => members.size > 1)
            .map(([id, members]) => ({
                id,
                members: [...members],
                counts: {
                    task: [...members].filter(
                        (member) =>
                            TASK_KINDS.has(kinds.get(member) ?? '') &&
                            kinds.get(member) !== 'conversation',
                    ).length,
                    fork: [...members].filter((member) => forks.has(member)).length,
                },
            }));
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
                data: {
                    ...node.data,
                    importance: heroes.has(node.id) ? 'hero' : this.#importanceOf(node),
                },
            })),
            edges: data.edges,
        };
    }

    #heroIDs(nodes: readonly ScopeNode[]): Set<string> {
        return new Set(
            nodes
                .filter(
                    (node) =>
                        node.kind === 'conversation' ||
                        node.kind === 'run' ||
                        (node.kind === 'message' && node.data?.['role'] === 'assistant') ||
                        (node.kind === 'boundary' && node.data?.['head'] !== undefined),
                )
                .map((node) => node.id),
        );
    }

    #importanceOf(node: ScopeNode): Importance {
        const declared = node.data?.['importance'];
        if (declared === 'hero' || declared === 'medium' || declared === 'compact') return declared;
        const status = String(node.data?.['status'] ?? '');
        if (
            node.kind === 'task' &&
            ['active', 'running', 'streaming', 'sleeping', 'waiting'].includes(status)
        )
            return 'hero';
        return ['message', 'action', 'boundary', 'task', 'pending'].includes(node.kind)
            ? 'medium'
            : 'compact';
    }

    #viewData(
        view: { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] },
        kernel: Kernel,
    ): { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] } {
        const { nodes, edges } = view;
        if (this.#viewName === 'graph') return view;
        if (this.#viewName === 'trace') return { nodes: this.#traceNodes(view), edges: [] };
        if (this.#viewName === 'docs')
            return {
                nodes: nodes.filter((node) => typeof node.data?.['doc'] === 'string'),
                edges: [],
            };
        if (this.#viewName === 'diff') return this.#diffData(view, kernel);
        const kinds =
            this.#viewName === 'tasks'
                ? TASK_KINDS
                : this.#viewName === 'transcript'
                  ? TRANSCRIPT_KINDS
                  : TIMELINE_KINDS;
        const ids = new Set(nodes.filter((node) => kinds.has(node.kind)).map((node) => node.id));
        return {
            nodes: nodes.filter((node) => ids.has(node.id)),
            edges: edges.filter(
                (edge) =>
                    ids.has(edge.source) &&
                    ids.has(edge.target) &&
                    (this.#viewName !== 'transcript' ||
                        ['orders', 'checkpoint'].includes(edge.kind)),
            ),
        };
    }

    #traceNodes(view: { readonly nodes: readonly ScopeNode[] }): readonly ScopeNode[] {
        const spans = view.nodes.flatMap((node) => {
            const trace = node.data?.['trace'];
            if (!trace || typeof trace !== 'object' || Array.isArray(trace) || !('spans' in trace))
                return [];
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
        return spans.length
            ? spans
            : view.nodes.filter((node) => node.data?.['trace'] !== undefined);
    }

    /** Diff nodes and edges come only from the two kernels; the view invents no causal link. */
    #diffData(
        view: { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] },
        kernel: Kernel,
    ): { readonly nodes: readonly ScopeNode[]; readonly edges: readonly ScopeEdge[] } {
        const peer = this.#pinnedID
            ? this.registry.get(this.#pinnedID)
            : this.registry.list().find((tab) => tab.id !== this.registry.activeID());
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
        for (const edge of diff.edges.removed)
            if (!delta.has(edge.id)) delta.set(edge.id, 'removed');
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
        positions: ReadonlyMap<
            string,
            { readonly x: number; readonly y: number; readonly z: number }
        >,
    ): {
        readonly laneLabels: readonly {
            id: string;
            label: string;
            y: number;
            anchorNodeId?: string;
        }[];
        readonly axisLabels: readonly {
            id: string;
            label: string;
            x: number;
            y: number;
            role: 'row' | 'column';
        }[];
    } {
        const first = presented.nodes[0];
        if (!first) return { laneLabels: [], axisLabels: [] };
        const y = positions.get(first.id)?.y ?? 0;
        const laneLabels =
            this.#viewName === 'diff'
                ? ['added', 'removed'].flatMap((kind) => {
                      const anchor = presented.nodes.find((node) => node.data?.['diff'] === kind);
                      return anchor
                          ? [
                                {
                                    id: kind,
                                    label: kind,
                                    y: positions.get(anchor.id)?.y ?? y,
                                    anchorNodeId: anchor.id,
                                },
                            ]
                          : [];
                  })
                : [
                      {
                          id: this.#viewName,
                          label: VIEW_LABELS[this.#viewName],
                          y,
                          anchorNodeId: first.id,
                      },
                  ];
        const axisLabels =
            this.#viewName === 'timeline' || this.#viewName === 'transcript'
                ? [
                      {
                          id: 'order',
                          label: 'committed order',
                          x: 0,
                          y: y - 90,
                          role: 'column' as const,
                      },
                  ]
                : [];
        return { laneLabels, axisLabels };
    }

    private renderTabs(): void {
        const strip = el('tab-strip');
        strip.replaceChildren(
            ...this.registry.list().map((tab) => {
                const active = this.registry.activeID() === tab.id;
                const element = button(tab.id, () => this.setTab(tab.id), {
                    className: 'tab',
                    dataset: { tab: tab.id },
                });
                element.id = `tab-${tab.id}`;
                element.setAttribute('role', 'tab');
                element.setAttribute('aria-controls', 'stage');
                element.setAttribute('aria-selected', String(active));
                element.tabIndex = active ? 0 : -1;
                element.addEventListener('keydown', (event) => {
                    const rtl = document.dir === 'rtl';
                    const delta =
                        event.key === 'ArrowRight'
                            ? rtl
                                ? -1
                                : 1
                            : event.key === 'ArrowLeft'
                              ? rtl
                                  ? 1
                                  : -1
                              : 0;
                    if (!delta) return;
                    event.preventDefault();
                    const tabs = this.registry.list();
                    const index = tabs.findIndex((entry) => entry.id === tab.id);
                    const next = tabs[(index + delta + tabs.length) % tabs.length]!;
                    this.setTab(next.id);
                    strip.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus();
                });
                return element;
            }),
        );
        const active = this.registry.activeID();
        if (active) el('stage').setAttribute('aria-labelledby', `tab-${active}`);
        const pin = el<HTMLButtonElement>('compare-pin');
        pin.disabled = this.registry.list().length < 2;
        pin.title = pin.disabled
            ? 'Open a second conversation to compare'
            : 'Pin another conversation for comparison';
    }

    private renderStatus(): void {
        const tab = this.registry.active() ?? this.registry.list()[0];
        const sleeping = tab
            ? tabKernel(tab).nodes.filter(
                  (node) => node.kind === 'task' && node.data?.['status'] === 'sleeping',
              ).length
            : 0;
        el('status-strip').replaceChildren(
            ...[
                [`provider: ${this.#status.provider}`, 'accent', 'i-signal'],
                [`storage: ${this.#status.storage}`, 'muted', 'i-docs'],
                [
                    `${this.#status.tasks} task${this.#status.tasks === 1 ? '' : 's'}`,
                    sleeping ? 'warn' : 'ok',
                    'i-tasks',
                ],
                [`tab ${this.registry.activeID()}`, 'ok', 'i-views'],
                ...(this.#omitted
                    ? [[`${this.#omitted} omitted by budget`, 'warn', 'i-lens']]
                    : []),
            ].map(([label, tone, icon]) => {
                const badge = document.createElement('span');
                badge.className = 'badge';
                badge.dataset['tone'] = tone;
                const glyph = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                glyph.setAttribute('class', 'icon');
                glyph.setAttribute('aria-hidden', 'true');
                const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                use.setAttribute('href', `#${icon}`);
                glyph.append(use);
                badge.append(glyph, document.createTextNode(label));
                return badge;
            }),
        );
    }

    private renderTasks(
        nodes: readonly {
            readonly id: string;
            readonly label: string;
            readonly kind: string;
            readonly data?: Readonly<Record<string, unknown>>;
        }[],
    ): void {
        const tasks = nodes.filter((node) => node.kind === 'task');
        el('tasks').replaceChildren(
            ...(tasks.length
                ? tasks.map((node) => {
                      const status = String(node.data?.['status'] ?? 'pending');
                      const signals = node.data?.['signals'];
                      return row(
                          node.label,
                          signals ? `${status}\n${String(signals)}` : status,
                          toneOf(node.kind, status),
                      );
                  })
                : [row('No live tasks')]),
        );
    }

    private renderTimeline(
        nodes: readonly {
            readonly id: string;
            readonly label: string;
            readonly kind: string;
            readonly data?: Readonly<Record<string, unknown>>;
        }[],
        edges: readonly {
            readonly kind: string;
            readonly source: string;
            readonly target: string;
        }[],
    ): void {
        const ordered = new Set(
            edges.filter((edge) => edge.kind === 'orders').map((edge) => edge.target),
        );
        const timeline = nodes.filter(
            (node) => ordered.has(node.id) || ['message', 'boundary', 'state'].includes(node.kind),
        );
        el('timeline').replaceChildren(
            ...(timeline.length
                ? timeline.map((node) => row(node.kind, dataText(node) || node.label))
                : [row('No committed entries')]),
        );
    }

    private rungButton(rung: RungSpec, current: string): HTMLButtonElement {
        const element = button(rung.label.toLowerCase(), () => this.setRung(rung.id), {
            dataset: { rung: rung.id },
        });
        element.setAttribute('aria-current', current);
        return element;
    }

    private renderRungs(): void {
        el('rung-switch').replaceChildren(
            ...RUNGS.map((rung) => {
                const element = this.rungButton(rung, String(this.#rung === rung.id));
                element.title = rung.description;
                return element;
            }),
        );
        const current = RUNGS.find((entry) => entry.id === this.#rung)!;
        el('app').dataset['rung'] = this.#rung;
        el('rung-badge').textContent = current.id;
        el('rung-caption').textContent = current.description;
        this.renderTrail();
    }

    private renderTrail(): void {
        const index = RUNGS.findIndex((entry) => entry.id === this.#rung);
        const nodes = RUNGS.slice(0, index + 1).flatMap((rung, position) => [
            ...(position
                ? [Object.assign(document.createElement('span'), { textContent: '›' })]
                : []),
            this.rungButton(rung, rung.id === this.#rung ? 'page' : 'false'),
        ]);
        el('trail').replaceChildren(...nodes);
    }

    private renderOverview(): void {
        if (!this.#ready) return;
        const svg = document.getElementById('survey-svg') as unknown as SVGSVGElement;
        const positions = new Map(
            [...this.#simulation.view().positions].map(([id, point]) => [
                id,
                { x: point.x, y: point.y },
            ]),
        );
        if (!positions.size) {
            this.#overviewProjection = undefined;
            svg.replaceChildren();
            return;
        }
        const viewport = this.renderer.getViewport?.();
        const projection = Navigation.project({
            positions,
            box: { width: 160, height: 100 },
            padding: 8,
            viewport: viewport?.extent
                ? { center: [viewport.center[0], viewport.center[1]], extent: viewport.extent }
                : undefined,
        });
        this.#overviewProjection = projection;
        const dots = [...positions.values()]
            .map((point) => {
                const at = projection.project(point);
                return `<circle cx="${at.x.toFixed(1)}" cy="${at.y.toFixed(1)}" r="2.2" />`;
            })
            .join('');
        const rect = projection.viewRect;
        const reticle = rect
            ? `<rect x="${rect.x.toFixed(1)}" y="${rect.y.toFixed(1)}" width="${rect.width.toFixed(1)}" height="${rect.height.toFixed(1)}" />`
            : '';
        svg.innerHTML = `<rect class="plate-frame" x="1" y="1" width="158" height="98" />${dots}${reticle}`;
    }

    private renderView(): void {
        el('view-badge').textContent = this.#viewName;
        el('tasks').toggleAttribute('data-active', this.#viewName === 'tasks');
        el('timeline').toggleAttribute('data-active', this.#viewName === 'timeline');
        for (const element of document.querySelectorAll<HTMLButtonElement>('#view-switch button'))
            element.setAttribute(
                'aria-pressed',
                String(element.dataset['view'] === this.#viewName),
            );
    }

    /** Documents keep the readable projection; transcript is a vector console over the same fold. */
    private renderReader(kernel: Kernel): void {
        const docs = this.#viewName === 'docs';
        const reader = el('reader');
        this.#readerController?.destroy();
        this.#readerController = undefined;
        reader.hidden = !docs;
        reader.setAttribute('aria-label', docs ? 'Documents' : 'Conversation transcript');
        el('canvas').hidden = docs;
        if (docs) {
            const nodes: readonly ReadingNode[] = kernel.nodes
                .filter((node) => typeof node.data?.['doc'] === 'string')
                .map((node) => ({
                    id: node.id,
                    label: labelForNode(node),
                    text: String(node.data?.['doc']),
                    format: 'markdown' as const,
                    meta: {
                        ...(typeof node.data?.['status'] === 'string'
                            ? { status: String(node.data['status']) }
                            : {}),
                    },
                }));
            this.#readerController = mountReading(reader, readingOrder(nodes, []), {
                title: `Documents — ${this.registry.active()?.id ?? ''}`,
                announce: (message) => this.announce(message),
                onReveal: (id) => {
                    this.setView('graph');
                    this.reveal(id);
                },
            });
            return;
        }
        if (this.#viewName === 'transcript') this.#renderConsole(kernel);
    }

    #terminal(): TerminalController {
        if (this.#terminalController) return this.#terminalController;
        const grid = terminalGrid({
            charWidth: 7.4,
            lineHeight: 18,
            gutter: 14,
            minWidth: 260,
            maxWidth: 720,
        });
        const glyphs = terminalGlyphs();
        const sink: TerminalSink<RenderModel> = {
            render: (model) => {
                this.renderer.setModel(model);
                requestAnimationFrame(() => {
                    el('canvas')
                        .querySelectorAll<HTMLElement>('[data-node-id]')
                        .forEach((node) => {
                            node.tabIndex = 0;
                            node.setAttribute('role', 'listitem');
                        });
                });
            },
            show: () => undefined,
            select: (target) =>
                this.renderer.setSelection(
                    target === null ? [] : typeof target === 'string' ? [target] : [...target],
                ),
            onNodeClick: (callback) => this.renderer.on('nodeClick', ({ id }) => callback(id)),
            onZoomBand: (callback) => this.renderer.on('bandChange', ({ band }) => callback(band)),
        };
        this.#terminalController = mountTerminalSink(sink, {
            grid,
            windowConfig: { size: 28, margin: 6, hysteresis: 5 },
            project: ({ visible }) => {
                const nodes: RenderNode[] = visible.map((entry, index) => {
                    const [width, height] = terminalLineSize(entry.text, grid, entry.octave ?? 0);
                    return {
                        id: entry.id,
                        kind: entry.kind,
                        label: entry.label,
                        html: `<div class="sg-terminal-line">${lineHTML(entry, glyphs)}</div>`,
                        position: [width / 2, -index * (height + 10), 0],
                        size: [width, height, 1],
                        status:
                            entry.status === 'failed'
                                ? 'error'
                                : entry.status === 'pending'
                                  ? 'warning'
                                  : 'success',
                        interactive: true,
                        data: { terminal: true },
                    };
                });
                const edges: RenderEdge[] = nodes.slice(1).map((node, index) => ({
                    id: `${nodes[index]!.id}->${node.id}`,
                    source: nodes[index]!.id,
                    target: node.id,
                    kind: 'orders',
                    style: 'solid' as const,
                }));
                const last = nodes.at(-1);
                if (last)
                    nodes.push({
                        id: 'terminal-prompt',
                        kind: 'prompt',
                        label: 'Prompt',
                        html: terminalPromptHTML('Send a message'),
                        position: [last.position[0], last.position[1] - 60, 0],
                        size: [520, 44, 1],
                        status: 'neutral',
                        interactive: true,
                        data: { terminal: true },
                    });
                return { nodes, edges };
            },
            onReveal: (id) => this.reveal(id),
            onFocus: (id) => {
                this.renderer.focus(id);
                requestAnimationFrame(() =>
                    el('canvas')
                        .querySelector<HTMLElement>(`[data-node-id="${id}"]`)
                        ?.focus({ preventScroll: true }),
                );
            },
            announce: (message) => this.announce(message),
        });
        el('canvas').addEventListener('keydown', (event) => {
            if (isEditableTarget(event.target)) return;
            const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-node-id]');
            if (!target || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const nodes = [...el('canvas').querySelectorAll<HTMLElement>('[data-node-id]')];
            const index = nodes.indexOf(target);
            const next =
                event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? nodes.length - 1
                      : Math.max(0, Math.min(nodes.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
            const node = nodes[next];
            if (!node?.dataset['nodeId']) return;
            node.focus();
            this.#terminalController?.focusLine(node.dataset['nodeId']);
            this.announce(`Line ${next + 1} of ${nodes.length}`);
        });
        let prompt: TerminalPromptController | undefined;
        prompt = mountTerminalPrompt(el('canvas'), {
            onSubmit: (text) => {
                el<HTMLInputElement>('prompt-input').value = text;
                el<HTMLFormElement>('prompt-form').requestSubmit();
                prompt?.composer()?.clear();
            },
        });
        return this.#terminalController;
    }

    #renderConsole(kernel: Kernel): void {
        const lines: readonly TerminalLine[] = kernel.nodes
            .filter((node) => TRANSCRIPT_KINDS.has(node.kind))
            .map((node) => ({
                id: node.id,
                kind: node.kind,
                status: String(node.data?.['status'] ?? 'complete'),
                label: labelForNode(node),
                text: dataText(node),
                octave: 0,
            }));
        this.#terminal().setLines(lines);
    }

    private renderLegend(): void {
        const statuses: readonly [string, string][] = [
            ['committed · complete', 'ok'],
            ['sleeping · waiting · pending', 'warn'],
            ['running · streaming', 'running'],
            ['failed · aborted', 'error'],
        ];
        el('legend').replaceChildren(
            ...statuses.map(([label, tone]) => row(label, tone, tone)),
            ...Object.entries(EDGE_LABELS).map(([kind, label]) =>
                row(`${edgeStyleForKind(kind).glyph} ${label}`, kind),
            ),
        );
    }

    private renderGlossary(): void {
        el('glossary').replaceChildren(
            ...Object.entries(GLOSSARY).map(([term, definition]) =>
                row(term, undefined, undefined, definition),
            ),
        );
    }

    private bindChrome(): void {
        for (const element of document.querySelectorAll<HTMLButtonElement>('#view-switch button'))
            element.addEventListener('click', () =>
                this.setView(element.dataset['view'] as ViewName),
            );
        el('help-close').addEventListener('click', () => this.toggleHelp(false));
        el('survey').addEventListener('click', (event) => {
            const projection = this.#overviewProjection;
            if (!projection) return;
            const rect = el('survey').getBoundingClientRect();
            this.#panOverviewTo(
                projection.unproject({
                    x: ((event.clientX - rect.left) / rect.width) * 160,
                    y: ((event.clientY - rect.top) / rect.height) * 100,
                }),
            );
        });
        el('survey').addEventListener('keydown', (event) => {
            const projection = this.#overviewProjection;
            if (!projection) return;
            const rect = projection.viewRect;
            const dx = event.key === 'ArrowRight' ? 8 : event.key === 'ArrowLeft' ? -8 : 0;
            const dy = event.key === 'ArrowDown' ? 8 : event.key === 'ArrowUp' ? -8 : 0;
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const rect = projection.viewRect;
                this.#panOverviewTo(projection.unproject({ x: rect?.x ?? 80, y: rect?.y ?? 50 }));
                return;
            }
            if (!dx && !dy) return;
            event.preventDefault();
            this.#panOverviewTo(
                projection.unproject({
                    x: (rect?.x ?? 80) + (rect?.width ?? 0) / 2 + dx,
                    y: (rect?.y ?? 50) + (rect?.height ?? 0) / 2 + dy,
                }),
            );
        });
    }

    #panOverviewTo(point: { x: number; y: number }): void {
        const viewport = this.renderer.getViewport?.();
        if (!viewport) return;
        this.renderer.setViewport({
            zoom: viewport.zoom,
            center: [point.x, point.y, viewport.center[2]],
        });
    }

    toggleHelp(visible?: boolean): void {
        const help = el('help');
        const next = visible ?? help.hidden;
        if (next === !help.hidden) return;
        help.hidden = !next;
        this.#helpScope?.dispose();
        this.#helpScope = next
            ? new ScopedOverlay({
                  container: help,
                  initialFocus: el<HTMLButtonElement>('help-close'),
                  onClose: () => this.toggleHelp(false),
              })
            : undefined;
    }
}
