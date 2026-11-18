// P0.3 runtime explorer. One page lists every discoverable axis, switches values without a rebuild,
// encodes the full state in the URL hash, and renders the same state against two OpenCode-free
// hosts: the renderer contract fixture and the framework-free second host. The representation
// ladder (P1.2) supplies the visible LOD swap.

import {
    applyPreset,
    axisDiff,
    ConfigState,
    EXAMPLE_PRESETS,
    manifestSpace,
    negotiate,
    randomize,
    resetToBaseline,
    type ConfigValue,
} from '@spacegraphjs/config';
import { libraryManifest } from '@spacegraphjs/config/library';
import { sampleDepth, type DepthAxis, type DepthMode } from 'spacegraphjs/depth';
import {
    CameraVerbRegistry,
    playMotion,
    type CameraAdapter,
    type CameraCommand,
    type MotionPlayback,
    type MotionVerb,
} from 'spacegraphjs/motion';
import {
    supportsSensory,
    worldPolicyFor,
    type WorldCapabilities,
    type WorldPolicy,
} from 'spacegraphjs/world';
import {
    supportsEmphasis,
    type EmphasisChannel,
    type RendererCapabilities,
    type RenderModel,
    type RenderNode,
} from '@spacegraphjs/renderer';
import { InlineGraph } from '@spacegraphjs/svg-renderer';
import {
    applyModelEmphasis,
    centralitySignal,
    createSalience,
    kindSignal,
    mappingFor,
    selectionSignal,
    statusSignal,
    type SalienceResult,
    type SalienceSignal,
} from 'spacegraphjs/salience';
import { DEFAULT_EDGE_STYLES, EDGE_RUNG_IDS, EdgeLadder } from 'spacegraphjs/edges/ladder';
import {
    DEFAULT_RUNG_IDS,
    ladderFromStops,
    playRepresentationChanges,
    representationChanges,
    type LadderContext,
    type LadderNode,
    type RepresentationPlayback,
    type RepresentationTween,
} from 'spacegraphjs/representations';
import {
    WidgetLayer,
    WidgetRegistry,
    WIDGET_SLOTS,
    type WidgetDescriptor,
    type WidgetSlot,
} from 'spacegraphjs/widgets';
import { ScaleDomain, type ScaleSample } from 'spacegraphjs/zoom';
import { activityHostFixture } from './activity-host';
import { SecondHost } from './second-host/host';
import { HOST_VIEWS, LEVELS, type BuildLevel, type HostView } from './second-host/model';

type Appearance = Pick<RenderNode, 'shape' | 'size'>;

interface BuiltGraph {
    readonly model: RenderModel;
    readonly rungs: ReadonlyMap<string, string>;
    readonly sample: ScaleSample;
}

interface TransitionInfo {
    readonly ids: readonly string[];
    readonly from: readonly string[];
    readonly to: readonly string[];
    readonly duration: number;
    t: number;
    done: boolean;
}

interface ExplorerApi {
    axes: () => readonly string[];
    config: () => Readonly<Record<string, ConfigValue>>;
    effective: () => Readonly<Record<string, ConfigValue>>;
    set: (axis: string, value: string) => ConfigValue | undefined;
    randomize: () => void;
    reset: () => void;
    compare: (enabled: boolean) => void;
    presets: () => readonly string[];
    applyPreset: (id: string) => boolean;
    hash: () => string;
    source: () => ConfigValue | undefined;
    nodes: () => readonly number[];
    diff: () => readonly {
        axis: string;
        left: ConfigValue | undefined;
        right: ConfigValue | undefined;
    }[];
    transition: () => TransitionInfo;
    salience: () => Readonly<Record<string, number>>;
    explain: (id: string) => Readonly<Record<string, number | string>>[];
    select: (id: string) => void;
    emphasisSupport: () => readonly string[];
    widgets: () => readonly string[];
    widgetOpacity: () => number | undefined;
    world: () => WorldPolicy;
    sensorySupport: () => boolean;
    camera: () => { command: CameraCommand | undefined; calls: readonly string[] };
    depth: () => Readonly<Record<string, number>>;
    motion: () => { frames: number; active: readonly string[]; done: boolean };
    playMotion: () => void;
}

declare global {
    interface Window {
        __explorer?: ExplorerApi;
        __ready?: boolean;
    }
}

const library = libraryManifest();
const levelNames = Object.keys(LEVELS.levelRank) as BuildLevel[];
const space = manifestSpace({
    contractVersion: library.contractVersion,
    entries: [
        ...library.entries,
        {
            id: 'source',
            values: ['contract', 'secondHost'],
            source: 'explorer/graph sources',
            default: 'contract',
        },
        {
            id: 'view',
            values: [...HOST_VIEWS],
            source: 'second-host/HOST_VIEWS',
            default: 'ribbon',
        },
        { id: 'level', values: levelNames, source: 'second-host/LEVELS', default: 'execution' },
    ],
});

const capabilities = new Set<string>();
const flags = new Set<string>();
const APPEARANCE: Readonly<Record<string, Appearance>> = {
    dot: { shape: 'dot', size: [18, 18, 0] },
    glyph: { shape: 'badge', size: [96, 24, 0] },
    card: { shape: 'card', size: [180, 64, 0] },
    widget: { shape: 'card', size: [220, 96, 0] },
    detail: { shape: 'panel', size: [260, 140, 0] },
};
const TRANSITION_SECONDS = 0.8;
const STOPS = DEFAULT_RUNG_IDS.map((id, index) => ({
    id,
    at: index / (DEFAULT_RUNG_IDS.length - 1),
    transitionDuration: TRANSITION_SECONDS,
}));
const BUILDERS = Object.fromEntries(
    DEFAULT_RUNG_IDS.map((id) => [id, () => APPEARANCE[id]!]),
) as Partial<Record<string, (node: LadderNode, context: LadderContext) => Appearance>>;
const domain = new ScaleDomain({
    stops: STOPS,
    range: { min: 1, max: 100, closerIsLarger: false },
});
const EDGE_STOPS = EDGE_RUNG_IDS.map((id, index) => ({
    id,
    at: index / (EDGE_RUNG_IDS.length - 1),
}));
const edgeDomain = new ScaleDomain({
    stops: EDGE_STOPS,
    range: { min: 1, max: 100, closerIsLarger: false },
});
const edgeLadder = new EdgeLadder(
    EDGE_STOPS.map((stop) => ({ ...stop, style: DEFAULT_EDGE_STYLES[stop.id] })),
);

const NOW = 1_000_000;
const RENDERER_CAPABILITIES: RendererCapabilities = {
    projections: ['2d', '3d'],
    depths: ['flat', 'layered', 'depth-stack', 'orbit'],
    domNodes: true,
    maxDomNodes: 80,
    edgeLabels: true,
    clusterNodes: true,
    minimap: false,
    maxRecommendedNodes: 300,
    emphasis: ['size', 'opacity', 'edgeThickness'],
    widgetSlots: [...WIDGET_SLOTS],
};

const DEMO_WIDGETS: readonly WidgetDescriptor[] = [
    { id: 'summary', label: 'Node summary', slots: ['body'], representations: ['card', 'widget'] },
    {
        id: 'composer',
        label: 'Composer',
        slots: ['attached'],
        representations: ['widget', 'detail'],
    },
    { id: 'terminal', label: 'Terminal', slots: ['pinned'], representations: ['detail'] },
];
const widgetRegistry = new WidgetRegistry();
for (const registration of DEMO_WIDGETS) {
    widgetRegistry.register({
        ...registration,
        capabilities: ['interactive', 'focus', 'depth-fade'],
        initialSize: { width: 220, height: 72 },
        mount: () => ({
            measure: () => ({ width: 220, height: 72 }),
            setOpacity: () => {},
            setInteractive: () => {},
            unmount: () => {},
        }),
    });
}
let mountedWidgets: readonly string[] = [];
let widgetOpacity: number | undefined;

const recency = (label: string, factor: number): SalienceSignal => ({
    id: 'recency',
    label,
    weight: 1,
    compute: ({ model }) =>
        new Map(model.nodes.map((node, index) => [node.id, 2 ** (-index / factor)])),
});
const CONTRACT_SIGNALS: Readonly<Record<string, SalienceSignal>> = {
    kind: kindSignal({ session: 1, tool: 0.5, phase: 0.2 }, 2),
    status: statusSignal({ running: 0.8, error: 0.6 }),
    recency: recency('fixture recency', 3),
    centrality: centralitySignal(),
    selection: selectionSignal(),
};
const SECOND_HOST_SIGNALS: Readonly<Record<string, SalienceSignal>> = {
    ...CONTRACT_SIGNALS,
    kind: kindSignal({ turn: 1, tool: 0.2, phase: 0.8 }, 2),
    status: statusSignal({ success: 1, warning: 0.7 }, 1.5),
    recency: recency('host recency', 6),
};

const host = new SecondHost();
const leftGraph = new InlineGraph(element('left-graph'));
const rightGraph = new InlineGraph(element('right-graph'));

let left = ConfigState.fromSearch(space, location.hash);
let right = randomize(space, seeded(41));
let compare = false;
let previousRungs: ReadonlyMap<string, string> = new Map();
let playback: RepresentationPlayback | undefined;
let frameHandle = 0;
let lastFrame = 0;
let lastTransition: TransitionInfo = { ids: [], from: [], to: [], duration: 0, t: 0, done: true };
let lastSalience: SalienceResult | undefined;
let selectedNode: string | undefined;
let leftNodeCount = 0;
let rightNodeCount = 0;
let lastWorld: WorldPolicy = worldPolicyFor(undefined, undefined, undefined);
let lastCameraCommand: CameraCommand | undefined;
const cameraCalls: string[] = [];
let lastDepthOffsets: Readonly<Record<string, number>> = {};
let motionPlayback: MotionPlayback | undefined;
let motionFrameHandle = 0;
let lastMotionVerb: ConfigValue | undefined = 'none';
let lastMotionTime = 0;
const cameraRegistry = new CameraVerbRegistry();
const WORLD_CAPABILITIES: WorldCapabilities = { sceneFeatures: [], sensory: [] };
const RECORDING_CAMERA_ADAPTER: CameraAdapter = {
    fit: (ids, duration) => cameraCalls.push(`fit:${ids?.join(',') ?? ''}:${duration}`),
    focus: (id, duration) => cameraCalls.push(`focus:${id}:${duration}`),
    flyTo: (position, target) =>
        cameraCalls.push(`flyTo:${position.join(',')}:${target.join(',')}`),
    orbit: (amount) => cameraCalls.push(`orbit:${amount}`),
    zoom: (amount) => cameraCalls.push(`zoom:${amount}`),
    reset: () => cameraCalls.push('reset'),
};

function element<T extends HTMLElement = HTMLElement>(id: string): T {
    const found = document.getElementById(id);
    if (!found) throw new Error(`explorer: missing #${id}`);
    return found as T;
}

function seeded(seed: number): () => number {
    let value = seed >>> 0;
    return () => (value = (value * 1103515245 + 12345) >>> 0) / 0x1_0000_0000;
}

function effective(state: ConfigState): ConfigState {
    return negotiate(space, state, { capabilities, flags }).state;
}

function signalsFor(state: ConfigState): readonly SalienceSignal[] {
    const chosen = state.get('salience') ?? 'none';
    const set = state.get('source') === 'secondHost' ? SECOND_HOST_SIGNALS : CONTRACT_SIGNALS;
    if (chosen === 'none') return [];
    if (chosen === 'combined') return Object.values(set);
    const signal = set[chosen];
    return signal ? [signal] : [];
}

function emphasisMapping(state: ConfigState) {
    const chosen = state.get('emphasis') ?? 'none';
    if (chosen === 'none' || !supportsEmphasis(RENDERER_CAPABILITIES, chosen as EmphasisChannel)) {
        return {};
    }
    return mappingFor([chosen as EmphasisChannel]);
}

function graphModel(state: ConfigState): BuiltGraph {
    const source = state.get('source');
    const model = source === 'secondHost' ? hostModel(state) : activityHostFixture();
    const selected = selectedNode ? new Set([selectedNode]) : undefined;
    lastSalience = createSalience(signalsFor(state))({ model, now: NOW, selected });
    const built = withDepth(
        withRepresentation(
            withEdgeLadder(model, state.get('edgeLod') ?? 'arrow'),
            state.get('lod') ?? 'card',
        ),
        state,
    );
    return {
        ...built,
        model: applyModelEmphasis(built.model, lastSalience.values, emphasisMapping(state)),
    };
}

function withDepth(built: BuiltGraph, state: ConfigState): BuiltGraph {
    const continuum = {
        mode: (state.get('depth') ?? 'flat') as DepthMode,
        axis: (state.get('depthAxis') ?? 'none') as DepthAxis,
        strength: 1,
        spread: 40,
    };
    const total = built.model.nodes.length;
    const offsets: Record<string, number> = {};
    const nodes = built.model.nodes.map((node, index) => {
        const sample = sampleDepth(continuum, total > 1 ? index / (total - 1) : 0, 120);
        offsets[node.id] = sample.offset;
        return {
            ...node,
            position: [node.position[0], node.position[1], sample.offset] as [
                number,
                number,
                number,
            ],
        };
    });
    lastDepthOffsets = offsets;
    return { ...built, model: { ...built.model, nodes } };
}

function withEdgeLadder(model: RenderModel, lod: string): RenderModel {
    const index = Math.max(0, EDGE_RUNG_IDS.indexOf(lod as (typeof EDGE_RUNG_IDS)[number]));
    const sample = edgeDomain.sample(index / (EDGE_RUNG_IDS.length - 1));
    return {
        ...model,
        edges: model.edges.map((edge) => {
            const selection = edgeLadder.select({ id: edge.id, kind: edge.kind }, sample);
            if (!selection) return edge;
            const { thickness, dashed, labelLod } = selection.style;
            return {
                ...edge,
                confidence:
                    thickness === 1 ? 'inferred' : thickness === 4 ? 'explicit' : 'structural',
                style: dashed ? ('dashed' as const) : ('solid' as const),
                label: labelLod ? (edge.label ?? edge.kind) : edge.label,
            };
        }),
    };
}

function hostModel(state: ConfigState): RenderModel {
    host.view = HOST_VIEWS.find((view) => view === state.get('view')) ?? ('ribbon' as HostView);
    host.level =
        levelNames.find((level) => level === state.get('level')) ?? ('execution' as BuildLevel);
    return host.renderModel();
}

function withRepresentation(model: RenderModel, lod: string): BuiltGraph {
    const index = Math.max(0, DEFAULT_RUNG_IDS.indexOf(lod as (typeof DEFAULT_RUNG_IDS)[number]));
    const sample = domain.sample(index / (DEFAULT_RUNG_IDS.length - 1));
    const ladder = ladderFromStops<LadderNode, Appearance>(STOPS, BUILDERS);
    const rungs = new Map<string, string>();
    const nodes = model.nodes.map((node) => {
        const selection = ladder.select({ id: node.id, kind: node.kind }, sample);
        if (!selection) return node;
        rungs.set(node.id, selection.rung.id);
        return { ...node, ...selection.value };
    });
    return { model: { ...model, nodes }, rungs, sample };
}

function syncWidgets(built: BuiltGraph, state: ConfigState): void {
    const choice = state.get('widgets') ?? 'none';
    const slots: readonly WidgetSlot[] =
        choice === 'none' ? [] : choice === 'max' ? WIDGET_SLOTS : [choice as WidgetSlot];
    const layer = new WidgetLayer({
        registry: widgetRegistry,
        slots,
        sizing: { max: { width: 320, height: 200 }, overflow: 'summary', feedLayout: true },
        representationOf: (id) => built.rungs.get(id) ?? 'dot',
    });
    layer.sync(built.model.nodes);
    const fogged = lastWorld.features.includes('fog') || state.get('depth') !== 'flat';
    layer.setDepthFade(1, fogged ? 0.5 : 0);
    mountedWidgets = layer.mounted().map((entry) => `${entry.nodeId}:${entry.descriptorId}`);
    widgetOpacity = layer.mounted()[0]?.opacity;
}

function play(built: BuiltGraph, state: ConfigState): void {
    if (frameHandle) cancelAnimationFrame(frameHandle);
    const changes = representationChanges(previousRungs, built.rungs, built.sample);
    previousRungs = built.rungs;
    lastTransition = {
        ids: changes.map((change) => change.id),
        from: changes.map((change) => change.from),
        to: changes.map((change) => change.to),
        duration: built.sample.transitionDuration,
        t: 0,
        done: true,
    };
    if (!changes.length) return;

    playback = playRepresentationChanges(
        changes,
        (change, value) => {
            lastTransition.t = value;
            applyAppearance(change, value);
        },
        { reducedMotion: state.get('motion') === 'reduced' },
    );
    lastTransition.done = playback.done;
    if (!playback.done) {
        lastFrame = performance.now();
        frameHandle = requestAnimationFrame(tick);
    }
}

function tick(time: number): void {
    if (!playback) return;
    playback.advance((time - lastFrame) / 1000);
    lastFrame = time;
    lastTransition.done = playback.done;
    frameHandle = playback.done ? 0 : requestAnimationFrame(tick);
}

function applyAppearance(change: RepresentationTween, value: number): void {
    const group = element('left-graph').querySelector<SVGGElement>(`[data-node-id="${change.id}"]`);
    if (!group) return;
    const from = APPEARANCE[change.from];
    const to = APPEARANCE[change.to];
    const lerp = (a: number, b: number) => a + (b - a) * value;
    const width = lerp(from?.size?.[0] ?? 120, to?.size?.[0] ?? 120);
    const height = lerp(from?.size?.[1] ?? 32, to?.size?.[1] ?? 32);
    group.dataset.rungFrom = change.from;
    group.dataset.rungTo = change.to;
    group.dataset.transitionT = value.toFixed(3);
    group.setAttribute('opacity', String(0.55 + 0.45 * value));
    group.querySelector('rect')?.setAttribute('width', String(width));
    group.querySelector('rect')?.setAttribute('height', String(height));
    group.querySelector('circle')?.setAttribute('r', String(Math.min(width, height) / 2));
}

function renderAxes(result: ReturnType<typeof negotiate>): void {
    const root = element('axes');
    root.replaceChildren();

    for (const axis of space.axes) {
        const field = document.createElement('fieldset');
        const legend = document.createElement('legend');
        legend.textContent = axis.id;
        field.append(legend);

        const values = document.createElement('div');
        values.className = 'values';
        for (const value of axis.values) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = value;
            button.dataset.axis = axis.id;
            button.dataset.value = value;
            button.setAttribute('aria-pressed', String(left.get(axis.id) === value));
            button.addEventListener('click', () => {
                left = left.set(axis.id, value);
                render();
            });
            values.append(button);
        }
        field.append(values);

        const status = result.axes.find((entry) => entry.axis === axis.id);
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent =
            status && status.status !== 'supported'
                ? `${status.status}: ${status.reason}${status.value !== status.requested ? ` → ${status.value}` : ''}`
                : `${axis.source}${axis.reducedMotion ? ` · ${axis.reducedMotion}` : ''}`;
        field.append(meta);
        root.append(field);
    }
}

function renderPresets(): void {
    const root = element('presets');
    root.replaceChildren();
    for (const preset of EXAMPLE_PRESETS) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = preset.label;
        button.title = preset.note ?? 'Example, not default';
        button.dataset.preset = preset.id;
        button.addEventListener('click', () => {
            left = applyPreset(space, preset, left);
            render();
        });
        root.append(button);
    }
}

function renderExplain(): void {
    const root = element('explain');
    root.replaceChildren();
    if (!selectedNode || !lastSalience) {
        root.textContent = 'Click a node to see why it is big.';
        return;
    }
    const score = lastSalience.values.get(selectedNode) ?? 0;
    root.textContent = [
        `${selectedNode} · salience ${score.toFixed(2)}`,
        ...lastSalience
            .explain(selectedNode)
            .map(
                (entry) =>
                    `${entry.label}: ${entry.value.toFixed(2)} × ${entry.weight} = ${entry.contribution.toFixed(2)}`,
            ),
    ].join('\n');
}

function renderWidgets(): void {
    const root = element('widgets');
    root.textContent = [
        ...DEMO_WIDGETS.map(
            (registration) => `${registration.id} · ${registration.slots.join(', ')}`,
        ),
        `attached: ${mountedWidgets.length ? mountedWidgets.join(', ') : 'none'}`,
        widgetOpacity === undefined ? 'opacity: —' : `opacity: ${widgetOpacity.toFixed(3)}`,
    ].join('\n');
}

function renderDiff(): void {
    const diff = element('diff');
    diff.hidden = !compare;
    diff.textContent = compare
        ? axisDiff(left, right)
              .map((entry) => `${entry.axis}: ${entry.left ?? '—'} → ${entry.right ?? '—'}`)
              .join('\n') || 'No axes differ.'
        : '';
}

function applyCamera(state: ConfigState): void {
    const verb = state.get('cameraVerb');
    if (!verb) return;
    const command: CameraCommand = {
        verb: verb as CameraCommand['verb'],
        ids: selectedNode ? [selectedNode] : undefined,
        position: [0, 0, 12],
        target: [0, 0, 0],
        amount: 0.3,
        duration: state.get('motion') === 'reduced' ? 0 : undefined,
    };
    lastCameraCommand = command;
    cameraRegistry.run(command, RECORDING_CAMERA_ADAPTER);
}

function playMotionFor(state: ConfigState): void {
    const verb = state.get('motionVerb');
    if (!verb || verb === 'none') return;
    if (motionFrameHandle) cancelAnimationFrame(motionFrameHandle);
    const steps = Object.keys(lastDepthOffsets)
        .slice(0, 6)
        .map((id, index) => ({
            id,
            verb: verb as MotionVerb,
            target: 'emphasis' as const,
            from: 0.2,
            to: 1,
            delay: index * 0.08,
            duration: 0.5,
        }));
    motionPlayback = playMotion(
        steps,
        (frame) => {
            const group = element('left-graph').querySelector<SVGGElement>(
                `[data-node-id="${frame.step.id}"]`,
            );
            if (!group) return;
            group.setAttribute('opacity', String(0.4 + 0.6 * frame.value));
            group.dataset.motionVerb = frame.step.verb;
        },
        { reducedMotion: state.get('motion') === 'reduced' },
    );
    lastMotionTime = performance.now();
    motionFrameHandle = motionPlayback.done ? 0 : requestAnimationFrame(motionTick);
}

function motionTick(time: number): void {
    if (!motionPlayback) return;
    motionPlayback.advance((time - lastMotionTime) / 1000);
    lastMotionTime = time;
    motionFrameHandle = motionPlayback.done ? 0 : requestAnimationFrame(motionTick);
}

function render(): void {
    const result = negotiate(space, left, { capabilities, flags });
    history.replaceState(null, '', left.toHash());
    element('hash').textContent = left.toHash();
    element('compare').setAttribute('aria-pressed', String(compare));
    element('stage').dataset.compare = String(compare);
    element('right-pane').hidden = !compare;
    element('left-title').textContent = `Configuration · ${left.get('source')}`;
    element('right-title').textContent = `Comparison · ${right.get('source')}`;

    renderAxes(result);
    renderPresets();
    lastWorld = worldPolicyFor(
        result.state.get('sceneFeature'),
        result.state.get('sensory'),
        result.state.get('lod'),
    );
    const built = graphModel(result.state);
    const leftSalience = lastSalience;
    leftNodeCount = built.model.nodes.length;
    leftGraph.setModel(built.model);
    syncWidgets(built, result.state);
    play(built, result.state);
    applyCamera(result.state);
    const motionVerb = result.state.get('motionVerb');
    if (motionVerb !== lastMotionVerb) {
        lastMotionVerb = motionVerb;
        if (motionVerb && motionVerb !== 'none') playMotionFor(result.state);
    }
    if (compare) {
        const rightBuilt = graphModel(effective(right));
        rightGraph.setModel(rightBuilt.model);
        rightNodeCount = rightBuilt.model.nodes.length;
    }
    lastSalience = leftSalience;
    renderExplain();
    renderWidgets();
    renderDiff();
}

element('randomize').addEventListener('click', () => {
    left = randomize(space, seeded(Date.now()));
    render();
});
element('reset').addEventListener('click', () => {
    left = resetToBaseline(space);
    render();
});
element('compare').addEventListener('click', () => {
    compare = !compare;
    render();
});
element('left-graph').addEventListener('click', (event) => {
    const group = (event.target as Element).closest<SVGGElement>('[data-node-id]');
    if (!group) return;
    selectedNode = group.dataset.nodeId;
    render();
});
window.addEventListener('hashchange', () => {
    const restored = ConfigState.fromSearch(space, location.hash);
    if (restored.equals(left)) return;
    left = restored;
    render();
});

window.__explorer = {
    axes: () => space.ids(),
    config: () => left.toRecord(),
    effective: () => effective(left).toRecord(),
    set: (axis, value) => {
        left = left.set(axis, value);
        render();
        return left.get(axis);
    },
    randomize: () => {
        left = randomize(space, seeded(Date.now()));
        render();
    },
    reset: () => {
        left = resetToBaseline(space);
        render();
    },
    compare: (enabled) => {
        compare = enabled;
        render();
    },
    presets: () => EXAMPLE_PRESETS.map((preset) => preset.id),
    applyPreset: (id) => {
        const preset = EXAMPLE_PRESETS.find((entry) => entry.id === id);
        if (!preset) return false;
        left = applyPreset(space, preset, left);
        render();
        return true;
    },
    hash: () => left.toHash(),
    source: () => left.get('source'),
    nodes: () => [leftNodeCount, rightNodeCount],
    diff: () => axisDiff(left, right),
    transition: () => ({ ...lastTransition }),
    salience: () => Object.fromEntries(lastSalience?.values ?? []),
    explain: (id) => (lastSalience?.explain(id) ?? []).map((entry) => ({ ...entry })),
    select: (id) => {
        selectedNode = id;
        render();
    },
    emphasisSupport: () => RENDERER_CAPABILITIES.emphasis ?? [],
    widgets: () => mountedWidgets,
    widgetOpacity: () => widgetOpacity,
    world: () => lastWorld,
    sensorySupport: () => supportsSensory(WORLD_CAPABILITIES, lastWorld.sensory),
    camera: () => ({ command: lastCameraCommand, calls: [...cameraCalls] }),
    depth: () => ({ ...lastDepthOffsets }),
    motion: () => ({
        frames: motionPlayback?.frames.length ?? 0,
        active: motionPlayback?.active ?? [],
        done: motionPlayback?.done ?? true,
    }),
    playMotion: () => playMotionFor(effective(left)),
};
window.__ready = true;
render();
