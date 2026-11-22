import {
    DEFAULT_THEME,
    supportsDepth,
    type DepthMode,
    type Projection,
    type RenderModel,
    type RenderTheme,
    type RendererViewport,
} from '@spacegraphjs/renderer';
import { SpaceGraphRenderer } from '@spacegraphjs/spacegraph-renderer';
import { agentDomain, changedFiles, failureDetails } from '@spacegraphjs/agent';
import { Kernel, diffKernels, type KernelOp } from '@spacegraphjs/kernel';
import type { GraphNode } from '@spacegraphjs/shared';
import {
    computeFollowFrame,
    DEFAULT_LIVE_FOLLOW_MODE,
    type CameraMove,
    type FollowMode,
} from '@spacegraphjs/navigation/follow';
import { GraphController } from 'spacegraphjs/control';
import { sampleDepth, type DepthAxis } from 'spacegraphjs/depth';
import { Navigation, Trail } from 'spacegraphjs/navigation';
import { ScopeSimulation, type ScopePolicyInput, type ScopeSpec } from 'spacegraphjs/layout';
import {
    MotionDirector,
    createCameraMotionHandlers,
    type CameraMotionHandlers,
    type MotionPlayback,
} from 'spacegraphjs/motion';
import {
    representationLayers,
    representationRung,
    representationWeights,
} from 'spacegraphjs/salience';
import { lerp, requireElement } from 'spacegraphjs/utils';
import {
    createVisionLoop,
    type VisionLoop,
    type VisionLoopAnalyzers,
    type VisionLoopReport,
    type VisionLoopScores,
    type VisionReport,
} from 'spacegraphjs/vision';
import type { RenderNode } from '@spacegraphjs/renderer';
import {
    createInstrumentKit,
    INSTRUMENT_IDS,
    WidgetLayer,
    WidgetRegistry,
    type InstrumentData,
    type InstrumentKit,
} from 'spacegraphjs/widgets';
import {
    AgentAdapter,
    cardMarkup,
    composedCardMarkup,
    focusCardMarkup,
    nodeSize,
    portalPreview,
    toAdapterModel,
    type AgentLevel,
} from './adapter';
import { derivePorts } from './anatomy';
import { innerTree, type InnerLayout } from './inner';
import {
    applyEdgeAttention,
    applyNodeAttention,
    salienceScore,
    type AttentionPolicy,
    type RibbonKinds,
} from './attention';
import { bindTouchVerbs, touchBindingsFor, type TouchVerb } from './touch';
import {
    createAnnotationWidgets,
    NoteStore,
    withPinnedNotes,
    type AnnotationWidgets,
    type PinnedNote,
} from './annotations';
import { CAPABILITIES, capabilityContext, runCapability, type PiHostState } from './capabilities';
import { buildCatalog, mountCatalog, type Catalog } from './catalog';
import { FIXTURE_ID, fixtureKernel, richFixtureKernel } from './fixture';
import { foldKernelOps } from './ops';
import {
    UNSUPPORTED,
    decayActivity,
    exportHTML,
    exportJSON,
    exportSVG,
    labelFontPx,
    levelForZoom,
    scoreVision,
    unsupportedSeams,
    windowedView,
    type Position,
    type VisionScores,
} from './policy/host';
import {
    POLICY_EXPERIMENTS,
    POLICY_PRESETS,
    POLICY_SCHEMA,
    decodePolicyVector,
    encodePolicyVector,
    mountPolicyPanel,
    experimentById,
    experimentReportMarkdown,
    exportOnlineOutcomes,
    measureExperiment,
    policyChange,
    presetById,
    sampleExperiment,
    presetVector,
    resolvePolicy,
    simulateAndScore,
    withLayer,
    type PolicyChangeEvent,
    type PolicyLayer,
    type PolicyLayers,
    type PolicySource,
    type PolicyVector,
    type ResolvedPolicy,
    type ExperimentCell,
} from './policy';
import {
    SessionRecorder,
    counterfactual,
    ergonomicProfile,
    replaySession,
    type EventScorer,
    type SessionRecording,
} from './recorder';
import { agentScopes, DEPTH, portalChain } from './scopes';
import { focusRoles, scaleForRole, type FocusScales } from './focus';
import { paletteTheme, paletteVars, readTheme } from './theme';
import { SHOTS, shotById, type Shot } from './shots';
import { decodePermalink, encodePermalink, isRevealHash, type PermalinkState } from './permalink';
import {
    createPhysicsPlaySession,
    type GravityPreset,
    type PhysicsPlaySession,
} from 'spacegraphjs/world';
import { buildReportHTML } from './report';
import { STUDY_TASKS } from './study';
import { traceOrder } from './trace';
import {
    contextualInstruments,
    createCommandSurface,
    createInspector,
    createStateFrame,
    HUD_TOKENS,
    INSPECTOR_TABS,
    type Command,
    type CommandMode,
    type CommandSurface,
    type FrameState,
    type Inspector,
    type InspectorTab,
    type StateFrame,
} from './shell';

export type Arrangement = 'stacked' | 'side' | 'floating';
export type Surface = 'log' | 'map' | 'hybrid';
export type LevelMode = AgentLevel | 'auto';

const FOLLOW_MODES: readonly FollowMode[] = ['off', 'turn', 'node', 'node+focus'];
const LEVELS: readonly AgentLevel[] = ['overview', 'execution', 'detail'];
const LEVEL_MODES: readonly LevelMode[] = ['auto', ...LEVELS];
const ARRANGEMENTS: readonly Arrangement[] = ['stacked', 'side', 'floating'];
const SURFACES: readonly Surface[] = ['log', 'map', 'hybrid'];

export const el = <T extends HTMLElement>(id: string): T => requireElement<T>(id, 'pi app');

type ButtonOptions = { className?: string; title?: string; dataset?: Record<string, string> };

function button(
    label: string,
    onClick: () => void,
    options: ButtonOptions = {},
): HTMLButtonElement {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    if (options.className) element.className = options.className;
    if (options.title) element.title = options.title;
    for (const [key, value] of Object.entries(options.dataset ?? {})) element.dataset[key] = value;
    element.addEventListener('click', onClick);
    return element;
}

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

const VISION_MODELS: Record<string, string> = {
    tla: '/tla_model.onnx',
    che: '/che_model.onnx',
    odn: '/odn_model.onnx',
    vhs: '/vhs_model.onnx',
    eqa: '/eqa_model.onnx',
};

type HostVision = {
    readonly strategy: string;
    readonly modelLoader: {
        readonly isLoaded: boolean;
        getAvailableModels(): readonly string[];
    };
    readonly visionSystem: {
        setStrategy(name: string): void;
        analyze(graph: unknown, camera: unknown): Promise<VisionReport>;
    };
    readonly modelsLoaded: boolean;
    loadModels(paths: Record<string, string>): Promise<void>;
};

type VisionInstance = {
    graph: unknown;
    renderer: { camera: unknown };
    vision: HostVision;
};

const visionInstance = (): VisionInstance | undefined => {
    const instances = (window as unknown as { SpaceGraph?: { instances?: Set<unknown> } })
        .SpaceGraph?.instances;
    return instances ? (Array.from(instances)[0] as VisionInstance | undefined) : undefined;
};

const hostVision = (): HostVision | undefined => visionInstance()?.vision;

/** Pure analyzers: the gate's strategy, without the autonomous fixer's layout mutation. */
const visionAnalyzers = (): VisionLoopAnalyzers | undefined => {
    const instance = visionInstance();
    if (!instance?.vision) return undefined;
    return {
        strategy: instance.vision.strategy,
        analyze: () =>
            instance.vision.visionSystem.analyze(instance.graph, instance.renderer.camera),
    };
};

/**
 * Never fabricate `modelsLoaded`. Heuristics is the honest default: the bundled ONNX files are
 * placeholders in this runtime, so only an explicit `?vision=onnx` opt-in attempts a real load.
 * The strategy is recorded per capture and a failed load falls back rather than inventing scores.
 */
const configureVision = async (): Promise<'onnx' | 'heuristics'> => {
    const vision = hostVision();
    const optedIn =
        typeof location !== 'undefined' &&
        new URLSearchParams(location.search).get('vision') === 'onnx';
    if (!vision || !optedIn) {
        vision?.visionSystem.setStrategy('heuristics');
        return 'heuristics';
    }
    await vision.loadModels(VISION_MODELS);
    if (vision.modelLoader.getAvailableModels().length === 0) {
        vision.visionSystem.setStrategy('heuristics');
        return 'heuristics';
    }
    vision.visionSystem.setStrategy('onnx');
    return 'onnx';
};

/**
 * Host-owned policy. The library never learns about Pi, prompts, lanes, levels or depth choices;
 * this class translates a stream of kernel ops into a settled, recursive 3D graph and drives the
 * simulation, activity, vision sampling and camera from one frame clock.
 */
export class PiHost {
    readonly renderer = new SpaceGraphRenderer();
    readonly simulation: ScopeSimulation;
    readonly director = new MotionDirector();
    readonly playSession: PhysicsPlaySession;

    #cameraMotion!: CameraMotionHandlers;

    get cameraMotion(): CameraMotionHandlers {
        return this.#cameraMotion;
    }

    #kernel = new Kernel();
    #theme: RenderTheme = DEFAULT_THEME;
    #controller = new GraphController({ trailMaxDepth: 8 });
    #trail = new Trail({ maxDepth: 12 });
    #adapter = new AgentAdapter();
    #notes = new NoteStore();
    #annotationWidgets?: AnnotationWidgets;
    #playback?: MotionPlayback;
    #flightFrom = { zoom: 1, center: [0, 0, 0] as [number, number, number] };
    #flightTo: Position = { x: 0, y: 0, z: 0 };
    #specs: readonly ScopeSpec[] = [];
    #nodeByQualified: ReadonlyMap<string, string> = new Map();
    #qualifiedByNode: ReadonlyMap<string, string> = new Map();
    #portalByNode: ReadonlyMap<string, string> = new Map();
    #view = agentDomain.build(new Kernel());
    #model?: RenderModel;
    #positions = new Map<string, Position>();
    #attention = { failures: 0, latest: '', changed: 0 };
    #evidence: readonly string[] = [];
    #followMode: FollowMode = DEFAULT_LIVE_FOLLOW_MODE;
    #lastFollowFrame: CameraMove | null = null;
    #traceIds: readonly string[] = [];
    #tracePositions: readonly Position[] = [];
    #traceProgress = 0;
    #level: AgentLevel = 'execution';
    #levelMode: LevelMode = 'auto';
    #arrangement: Arrangement = 'side';
    #surface: Surface = 'hybrid';
    #depthAxis: DepthAxis = 'turn';
    #depth: DepthMode = 'orbit';
    #projection: Projection;
    #reducedMotion: boolean;
    #global: boolean;
    #revealed = '';
    #pinnedReveal?: string;
    #clock = false;
    #ticks = 0;
    #lastFrame = 0;
    #fps = 0;
    #activity = new Map<string, number>();
    #vision: VisionScores = { overlap: 0, legibility: 1 };
    #visionStrategy: 'onnx' | 'heuristics' = 'heuristics';
    #visionTime = 0;
    #minimapTime = 0;
    #visionLoop?: VisionLoop;
    #visionLoopEnabled = false;
    #visionLoopBusy = false;
    #visionReport?: VisionLoopReport;
    #windowSize = 60;
    #hidden = 0;
    #laneScope = '';
    #paused = false;
    #policyLayers: PolicyLayers = {};
    #resolved: ResolvedPolicy;
    #catalog: Catalog;
    #transcriptCollapsed = false;
    #transcriptWidth = 320;
    #transcriptHeight = 200;
    #expandedMessages = new Set<string>();
    #initialFitDone = false;
    #initialFitTimer?: ReturnType<typeof setTimeout>;
    #policyPanel?: ReturnType<typeof mountPolicyPanel>;
    #inspector?: Inspector;
    #focusConnector?: SVGLineElement;
    #commandSurface?: CommandSurface;
    #stateFrame?: StateFrame;
    #manualFrame?: { readonly state: FrameState; readonly detail: string };
    #instrumentFocus = '';
    #lensSignature = '';
    #policyListeners = new Set<(event: PolicyChangeEvent) => void>();
    #recorder: SessionRecorder;
    #startedAt = typeof performance === 'undefined' ? 0 : performance.now();
    #lastZoomDirection = 0;
    #zoomOscillations = 0;
    #lastEdgeClick?: { id: string; at: number };
    #hover?: { id: string; at: number };
    #dissolving?: string;
    #instruments?: InstrumentKit;
    #inspectorInstruments?: InstrumentKit;
    #clientID = '';
    #baselineKernel = fixtureKernel();
    #shotReady = true;

    constructor(
        options: { projection?: Projection; reducedMotion?: boolean; global?: boolean } = {},
    ) {
        this.#projection = options.projection ?? '3d';
        this.#global = options.global ?? true;
        this.#reducedMotion =
            options.reducedMotion ??
            (typeof matchMedia === 'function' &&
                matchMedia('(prefers-reduced-motion: reduce)').matches);
        const params =
            typeof location === 'undefined'
                ? new URLSearchParams()
                : new URLSearchParams(location.search);
        const shot = shotById(params.get('shot'));
        const scenario = params.get('scenario') ?? shot?.scenario;
        if (scenario === 'rich') this.#kernel = richFixtureKernel();
        const presetID = params.get('preset') ?? shot?.preset;
        const embedded = params.get('policy');
        if (presetID && presetById(presetID)) {
            this.#policyLayers.preset = presetVector(POLICY_SCHEMA, presetID);
        }
        if (embedded) {
            const vector = decodePolicyVector(POLICY_SCHEMA, embedded);
            if (vector) this.#policyLayers.url = vector;
        }
        const shotVector: PolicyVector = {
            ...(shot?.surface ? { 'surface.mode': shot.surface } : {}),
            ...(shot?.arrangement ? { 'surface.arrangement': shot.arrangement } : {}),
            ...shot?.vector,
        };
        if (Object.keys(shotVector).length)
            this.#policyLayers.url = { ...this.#policyLayers.url, ...shotVector };
        this.#resolved = resolvePolicy(POLICY_SCHEMA, this.#policyLayers);
        this.#catalog = buildCatalog(POLICY_SCHEMA);
        const geometry = this.geometry();
        this.simulation = new ScopeSimulation({
            instant: this.#reducedMotion,
            layout: {
                seed: 7,
                gap: geometry.gap,
                depthStep: geometry.depthStep,
                nodePadding: geometry.padding,
            },
            forces: {
                repulsion: geometry.repulsion,
                attraction: 0.018,
                cooling: 0.94,
                maxBodies: 120,
            },
        });
        const simulation = this.simulation;
        this.playSession = createPhysicsPlaySession({
            physics: {
                settings: {
                    enabled: false,
                    gravity: 0,
                    collide: true,
                    repulsion: 120,
                    damping: 0.98,
                    groundY: null,
                },
            },
            simulation: {
                setInstant: (value) => simulation.setInstant(value),
                settle: () => simulation.settle(),
                get settled() {
                    return simulation.settled;
                },
                get energy() {
                    return simulation.energy;
                },
            },
        });
        this.#trail.onChange(() => this.renderTrail());
        const values = this.#resolved.values;
        this.#depth = values['depth.mode'] as DepthMode;
        this.#surface = values['surface.mode'] as Surface;
        this.#arrangement = values['surface.arrangement'] as Arrangement;
        this.#windowSize = Number(values['guardrails.window']);
        this.#recorder = new SessionRecorder(
            FIXTURE_ID,
            () => (typeof performance === 'undefined' ? 0 : performance.now()) - this.#startedAt,
        );
    }

    get policy(): {
        readonly values: PolicyVector;
        readonly provenance: Readonly<Record<string, PolicySource>>;
        readonly presets: typeof POLICY_PRESETS;
    } {
        return {
            values: this.#resolved.values,
            provenance: this.#resolved.provenance,
            presets: POLICY_PRESETS,
        };
    }

    onPolicyChange(listener: (event: PolicyChangeEvent) => void): () => void {
        this.#policyListeners.add(listener);
        return () => this.#policyListeners.delete(listener);
    }

    setKnob(id: string, value: string | number | boolean, layer: PolicyLayer = 'panel'): boolean {
        if (!POLICY_SCHEMA.knobs.some((knob) => knob.id === id)) return false;
        this.#policyLayers = withLayer(POLICY_SCHEMA, this.#policyLayers, layer, { [id]: value });
        this.#resolved = resolvePolicy(POLICY_SCHEMA, this.#policyLayers);
        this.applyPolicy();
        this.paint();
        const event = policyChange(id, layer, this.#resolved);
        for (const listener of this.#policyListeners) listener(event);
        this.recordEvent('policy:change', { id, source: layer, value: String(value) });
        return true;
    }

    setPolicyLayer(layer: PolicyLayer, values: PolicyVector): void {
        this.#policyLayers = { ...this.#policyLayers, [layer]: { ...values } };
        this.#resolved = resolvePolicy(POLICY_SCHEMA, this.#policyLayers);
        this.applyPolicy();
        this.paint();
    }

    assignExperiment(cell: ExperimentCell): void {
        this.setPolicyLayer('experiment', cell.vector);
        this.recordEvent('experiment:exposure', { cell: cell.id });
    }

    resetKnobs(ids: readonly string[]): void {
        const panel = { ...this.#policyLayers.panel };
        for (const id of ids) delete panel[id];
        this.#policyLayers = { ...this.#policyLayers, panel };
        this.#resolved = resolvePolicy(POLICY_SCHEMA, this.#policyLayers);
        this.applyPolicy();
        this.paint();
    }

    recordEvent(
        kind: string,
        meta: Readonly<Record<string, string | number | boolean>> = {},
    ): void {
        const vision = this.#visionReport?.scores ?? this.#visionLoop?.lastReport?.scores;
        this.#recorder.record(kind, this.#resolved.vector, {
            legibility: vision?.legibility ?? this.#vision.legibility,
            overlap: vision?.overlap ?? this.#vision.overlap,
            ...meta,
        });
    }

    recording(): SessionRecording {
        return this.#recorder.export();
    }

    replayRecording(policy: PolicyVector = this.#resolved.vector) {
        return replaySession(this.recording(), policy, this.#eventScorer);
    }

    counterfactual(variant: PolicyVector, incumbent: PolicyVector = this.#resolved.vector) {
        return counterfactual(this.recording(), incumbent, variant, this.#eventScorer);
    }

    readonly #eventScorer: EventScorer = (event, policy) => ({
        success: event.kind === 'answer' ? 1 : 0,
        wrongTurns:
            typeof event.meta.wrongTurns === 'number'
                ? event.meta.wrongTurns
                : event.kind === 'wrong-turn'
                  ? 1
                  : 0,
        travel: typeof event.meta.travel === 'number' ? event.meta.travel : 0,
        legibility:
            typeof event.meta.legibility === 'number'
                ? event.meta.legibility
                : Number(policy['emphasis.cap']),
    });

    private geometry(): { gap: number; padding: number; depthStep: number; repulsion: number } {
        const values = this.#resolved.values;
        return {
            gap: Number(values['geometry.gap']),
            padding: Number(values['geometry.padding']),
            depthStep: Number(values['depth.step']),
            repulsion: Number(values['geometry.repulsion']),
        };
    }

    /** View colors are host CSS data; the renderer theme follows them without renderer branches. */
    private applyViewTheme(): void {
        if (typeof document === 'undefined') return;
        const values = this.#resolved.values;
        for (const [name, value] of Object.entries(paletteVars(String(values['theme.palette']))))
            document.documentElement.style.setProperty(name, value);
        document.documentElement.style.setProperty('--view-glow', String(values['theme.glow']));
        document.documentElement.dataset.backdrop = String(values['theme.backdrop']);
        this.#theme = paletteTheme(readTheme(), String(values['theme.palette']));
    }

    private applyPolicy(): void {
        const values = this.#resolved.values;
        const depth = values['depth.mode'] as DepthMode;
        if (supportsDepth(this.renderer.capabilities, depth)) {
            this.#depth = depth;
            this.renderer.setDepth(depth);
        }
        this.#surface = values['surface.mode'] as Surface;
        this.#arrangement = values['surface.arrangement'] as Arrangement;
        this.#windowSize = Number(values['guardrails.window']);
        this.simulation.setBaseLayout({
            gap: Number(values['geometry.gap']),
            depthStep: Number(values['depth.step']),
            nodePadding: Number(values['geometry.padding']),
        });
        this.simulation.setForces({ repulsion: Number(values['geometry.repulsion']) });
        if (typeof document !== 'undefined') {
            document.documentElement.style.setProperty(
                '--pi-blend',
                `${values['ladder.blendMs']}ms`,
            );
            document.documentElement.dataset.theme = String(values['theme.variant']);
            this.applyViewTheme();
            this.renderer.setTheme(this.#theme);
            el('minimap').hidden = values['navigation.minimap'] !== true;
            el('portal-crumb').hidden = values['navigation.breadcrumbs'] !== true;
            el('trail-nav').hidden = values['navigation.trail'] !== true;
            el('rail').dataset.widgetsDock = String(values['widgets.dock']);
            el('gallery').dataset.verbs = String(values['orchestration.verbs']);
        }
        this.applySurface();
        this.syncDepthSelect();
        this.renderGallery();
        this.renderHud();
        this.#policyPanel?.update(this.#resolved);
    }

    async mount(container: HTMLElement): Promise<void> {
        this.applyViewTheme();
        await this.renderer.mount(container, {
            theme: this.#theme,
            projection: this.#projection,
            reducedMotion: this.#reducedMotion,
            global: this.#global,
        });
        if (this.#global) this.#visionStrategy = await configureVision();
        if (!supportsDepth(this.renderer.capabilities, this.#depth)) this.#depth = 'flat';
        this.renderer.setDepth(this.#depth);
        this.#controller.bind(this.renderer);
        this.#cameraMotion = this.registerMotion();
        let mountedPanel: ReturnType<typeof mountPolicyPanel> | undefined;
        const policyRegistry = new WidgetRegistry().register({
            id: 'policy',
            label: 'Policy panel',
            slots: ['pinned'],
            mount: () => {
                mountedPanel = mountPolicyPanel(el('policy-panel'), POLICY_SCHEMA, this.#resolved, {
                    onChange: (id, value) => this.setKnob(id, value),
                    onReset: (ids) => this.resetKnobs(ids),
                    onCopy: () => {
                        void navigator.clipboard
                            ?.writeText(this.permalink())
                            .catch(() => undefined);
                    },
                });
                return {
                    element: mountedPanel.element,
                    measure: () => ({ width: 360, height: 320 }),
                    unmount: () => mountedPanel?.element.remove(),
                };
            },
        });
        const policyLayer = new WidgetLayer({
            registry: policyRegistry,
            slots: ['pinned'],
            representationOf: () => 'detail',
        });
        const policyNode: RenderNode = {
            id: 'policy:panel',
            kind: 'control',
            label: 'Policy panel',
            position: [0, 0, 0],
            widgets: ['policy'],
        };
        policyLayer.sync([policyNode]);
        this.#policyPanel = mountedPanel;
        const kitData = (node: RenderNode): InstrumentData => this.instrumentData(node);
        const kitAction = (action: string, node: RenderNode): void =>
            this.onInstrumentAction(action, node);
        this.#instruments = createInstrumentKit(el('instrument-kit'), kitData, kitAction);
        this.#annotationWidgets = createAnnotationWidgets(el('annotation-list'), (id) =>
            this.removeNote(id),
        );
        bindTouchVerbs(
            el('canvas'),
            () => touchBindingsFor(String(this.#resolved.values['navigation.touch'])),
            (verb) => this.dispatchTouchVerb(verb),
        );
        this.bindTranscript();
        this.bindNodeActions();
        this.#inspector = createInspector((tab, pinned) =>
            this.recordEvent('inspector:change', { tab, pinned }),
        );
        this.#inspectorInstruments = createInstrumentKit(
            this.#inspector.signals,
            kitData,
            kitAction,
        );
        const overlay = this.#inspector.element;
        overlay.hidden = true;
        overlay.addEventListener('pointerdown', (event) => event.stopPropagation());
        overlay.addEventListener('click', (event) => {
            const button = (event.target as HTMLElement).closest<HTMLElement>('[data-node-action]');
            if (!button?.dataset.nodeAction || !button.dataset.target) return;
            event.stopPropagation();
            this.handleNodeAction(button.dataset.nodeAction, button.dataset.target);
        });
        el('canvas').append(overlay);
        const connector = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        connector.id = 'focus-connector';
        connector.toggleAttribute('hidden', true);
        const connectorLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        connector.append(connectorLine);
        el('canvas').append(connector);
        this.#focusConnector = connectorLine;
        this.#commandSurface = createCommandSurface(() => this.commands(), { help: this.help() });
        document.body.append(this.#commandSurface.element);
        this.#stateFrame = createStateFrame();
        el('canvas').append(this.#stateFrame.element);
        window.addEventListener('resize', () => this.renderFocusLens());
        this.renderer.on('nodeClick', ({ id }) => this.reveal(id));
        this.renderer.on('viewportChange', ({ zoom }) => {
            this.applyAutoLevel(zoom);
            this.renderFocusLens();
        });
        this.renderer.on('edgeClick', ({ id }) => {
            const now = typeof performance === 'undefined' ? 0 : performance.now();
            if (this.#lastEdgeClick?.id === id && now - this.#lastEdgeClick.at < 400) {
                this.#lastEdgeClick = undefined;
                this.traverseEdge(id);
            } else this.#lastEdgeClick = { id, at: now };
        });
        this.renderer.on('hoverChange', ({ id }) => {
            const now = typeof performance === 'undefined' ? 0 : performance.now();
            if (this.#hover && now - this.#hover.at > 600) {
                this.recordEvent('hover-dwell', {
                    target: this.#hover.id,
                    ms: Math.round(now - this.#hover.at),
                });
            }
            this.#hover = id ? { id, at: now } : undefined;
        });

        this.refresh();
        this.simulation.settle();
        this.renderPositions();
        this.renderGallery();
        mountCatalog(el('catalog'), this.#catalog);
        this.renderProofLine();
        this.mountFirstRunHint();
        this.renderTranscript();
        this.renderOverview();
        this.renderTurnMap();
        this.renderHud();
        this.renderTrail();
        this.renderPortalCrumb();
        this.renderMinimap();
        this.bindControls();
        this.renderVisionLoop();
        if (
            this.#global &&
            typeof location !== 'undefined' &&
            new URLSearchParams(location.search).get('visionLoop') === 'on'
        ) {
            this.setVisionLoop(true);
        }
        this.applyPolicy();
        if (this.#kernel.nodes.length > 0) {
            this.#initialFitDone = true;
            this.fitView();
            requestAnimationFrame(() => this.paint());
        }
        this.syncClock();

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.#clock = false;
            else this.syncClock();
        });
    }

    refresh(): void {
        this.#view = agentDomain.build(this.#kernel);
        this.#controller.setModel(this.#view);
        const scopes = agentScopes(this.#view, { laneScope: this.#laneScope || undefined });
        this.#nodeByQualified = scopes.nodeById;
        this.#qualifiedByNode = scopes.qualifiedById;
        this.#portalByNode = scopes.portalByNode;
        this.#specs = scopes.specs;
        this.#trail.reconcile(
            new Map(
                this.#view.nodes.map((node) => [
                    node.id,
                    { id: node.id, label: node.label, kind: node.kind },
                ]),
            ),
        );
        this.simulation.setSpecs(scopes.specs, {
            band: this.band(),
            focus: this.#qualifiedByNode.get(this.#controller.selection[0]),
        });
        this.#attention = {
            failures: failureDetails(this.#view).length,
            latest: failureDetails(this.#view).at(-1)?.label ?? '',
            changed: changedFiles(this.#view).length,
        };
        this.paint();
        this.renderStatus();
        this.applyFrame();
        this.renderAttention();
        this.renderOverview();
    }

    consume(op: KernelOp): void {
        if (this.#paused) return;
        const before = new Set(this.#kernel.nodes.map((node) => node.id));
        this.#kernel = foldKernelOps([op], this.#kernel);
        const newNodes = this.#kernel.nodes
            .filter((node) => !before.has(node.id))
            .map((node) => ({
                id: node.id,
                kind: node.kind,
                label: node.label,
                status: String(node.data?.status ?? ''),
            }));
        this.refresh();
        for (const node of newNodes) {
            this.#activity.set(node.id, 1);
            for (const edge of this.#view.edges) {
                if (edge.source === node.id) this.#activity.set(edge.target, 1);
                if (edge.target === node.id) this.#activity.set(edge.source, 1);
            }
        }
        this.follow(newNodes);
        this.renderTranscript();
        this.renderTurnMap();
        this.syncClock();
        if (!this.#initialFitDone && this.#kernel.nodes.length > 0) {
            if (this.#initialFitTimer) clearTimeout(this.#initialFitTimer);
            this.#initialFitTimer = setTimeout(() => {
                if (this.#initialFitDone) return;
                this.#initialFitDone = true;
                this.simulation.settle();
                this.renderPositions();
                this.fitView();
                requestAnimationFrame(() => this.paint());
            }, 120);
        }
    }

    paint(): void {
        this.#positions = this.simulatedPositions();
        const windowed = windowedView(this.#view, this.#windowSize);
        this.#hidden = windowed.hidden;
        const model = toAdapterModel(windowed.view);
        const values = this.#resolved.values;
        const focus = this.#revealed || this.#controller.selection[0] || '';
        const roles = focusRoles(focus, this.#view.edges);
        const scales: FocusScales = {
            focus: Number(values['emphasis.focusScale']),
            neighbor: Number(values['emphasis.neighborScale']),
            context: Number(values['emphasis.contextScale']),
        };
        const scalingOn = scales.focus !== 1 || scales.neighbor !== 1 || scales.context !== 1;
        if (typeof document !== 'undefined') {
            document.documentElement.dataset.focusScale = String(scalingOn);
            document.documentElement.dataset.scopeFocus = this.#portalByNode.get(focus) ?? '';
        }
        const attention: AttentionPolicy = {
            salienceSize: Number(values['emphasis.salienceSize']),
            ribbonWidth: Number(values['emphasis.ribbonWidth']),
            ribbonKinds: String(values['emphasis.ribbonKinds']) as RibbonKinds,
        };
        const cardBg = HUD_TOKENS[values['theme.variant'] === 'light' ? 'light' : 'dark']!.colors.card;
        const scaleOf = (node: { id: string; emphasis?: number }): number => {
            const salience = salienceScore(this.#activity.get(node.id) ?? 0, node.emphasis);
            return (
                (1 + (attention.salienceSize - 1) * salience) *
                scaleForRole(roles.get(node.id) ?? 'none', scales)
            );
        };
        model.nodes = model.nodes.map((node) => {
            const scope = this.#portalByNode.get(node.id);
            const preview = scope ? portalPreview(scope, this.#specs) : '';
            const ports = derivePorts(node.id, this.#view.edges, (id) => this.#positions.get(id));
            return {
                ...node,
                ...(scope ? { scope } : {}),
                ...(ports || preview
                    ? { data: { ...node.data, ...(preview ? { preview } : {}), ...(ports ? { ports } : {}) } }
                    : {}),
                focusRole: roles.get(node.id) ?? 'none',
            };
        });
        const viewport = this.renderer.getViewport();
        const pixelsPerWorld =
            (el('canvas').clientWidth || 1000) / Math.max(viewport.extent?.width ?? 1000, 1);
        const minLabelPx = Number(values['ladder.minLabelPx']);
        const thresholds = {
            promoteAt: Number(values['ladder.promoteAt']),
            legibilityGate: Number(values['ladder.legibilityGate']),
            demoteBelow: Number(values['ladder.demoteBelow']),
        };
        const detailNodes = new Set<string>();
        this.#model = this.#adapter.build(model, {
            level: this.#level,
            positions: this.#positions,
            edges: true,
            focus: this.#controller.selection[0],
            renderCard: (node, level, context) => {
                const input = {
                    level,
                    activity: this.#activity.get(node.id) ?? 0,
                    legibility: this.#vision.legibility,
                };
                const weights = representationWeights(input, thresholds);
                const blend = 1 - Math.max(weights.overview, weights.execution, weights.detail);
                const descending =
                    this.#dissolving !== undefined &&
                    this.#portalByNode.get(node.id) === this.#dissolving;
                const rung = representationRung(input, thresholds);
                if (rung === 'detail') detailNodes.add(node.id);
                const layers = representationLayers(input, thresholds);
                const labelPx = labelFontPx(
                    minLabelPx,
                    pixelsPerWorld,
                    nodeSize(node.kind, true)[0] * scaleOf(node),
                    node.label.length,
                );
                return layers.length > 1
                    ? composedCardMarkup(node, layers, context, descending, labelPx)
                    : cardMarkup(node, rung, context, blend, descending, labelPx);
            },
        });
        if (this.#traceIds.length) {
            const traced = new Set(this.#traceIds);
            this.#model = {
                ...this.#model,
                edges: this.#model.edges.map((edge) =>
                    traced.has(edge.source) && traced.has(edge.target)
                        ? { ...edge, emphasis: 1 }
                        : edge,
                ),
            };
        }
        this.#model = withPinnedNotes(this.#model, this.#notes.list);
        const visible = new Set(
            this.#model.nodes.filter((node) => node.visible !== false).map((node) => node.id),
        );
        this.#model = {
            ...this.#model,
            nodes: this.#model.nodes.map((node) => {
                const size = nodeSize(node.kind, Boolean(node.html));
                const focusScale = scaleForRole(roles.get(node.id) ?? 'none', scales);
                const salience = salienceScore(this.#activity.get(node.id) ?? 0, node.emphasis);
                const withWidgets = detailNodes.has(node.id)
                    ? { ...node, widgets: [...(node.widgets ?? []), ...INSTRUMENT_IDS] }
                    : node;
                const styled = applyNodeAttention(withWidgets, size, salience, attention, focusScale);
                const style = { ...((styled.data?.style as Record<string, string> | undefined) ?? {}) };
                return {
                    ...styled,
                    data: { ...styled.data, style: { ...style, backgroundColor: cardBg } },
                };
            }),
            edges: this.#model.edges
                .filter((edge) => visible.has(edge.source) && visible.has(edge.target))
                .map((edge) => {
                    const salience = salienceScore(
                        Math.max(
                            this.#activity.get(edge.source) ?? 0,
                            this.#activity.get(edge.target) ?? 0,
                            edge.emphasis ?? 0,
                        ),
                    );
                    return applyEdgeAttention(edge, salience, attention);
                }),
        };
        this.#annotationWidgets?.refresh(this.#model.nodes);
        this.refreshInstruments(
            this.#model.nodes.find(
                (node) => node.id === (this.#revealed || this.#controller.selection[0]),
            ),
        );
        this.renderer.setModel(this.#model);
        this.renderHistory();
        this.renderMinimap();
        this.renderFocusLens();
    }

    renderPositions(): void {
        this.#positions = this.simulatedPositions();
        if (!this.#model) return this.paint();
        const values = this.#resolved.values;
        const cap = Number(values['emphasis.cap']);
        const trace = Number(values['emphasis.trace']);
        this.#model = {
            ...this.#model,
            nodes: this.#model.nodes.map((node) => {
                const position = this.#positions.get(node.id);
                const activity = this.#activity.get(node.id) ?? 0;
                const base =
                    activity > 0 ? Math.min(cap, (node.emphasis ?? 0.3) + activity) : node.emphasis;
                const index = this.#traceIds.indexOf(node.id);
                const traced = index >= 0 && index <= this.#traceProgress + 1;
                return {
                    ...node,
                    position: position
                        ? ([position.x, position.y, position.z] as [number, number, number])
                        : node.position,
                    emphasis: traced ? trace : base,
                };
            }),
        };
        this.renderer.setModel(this.#model);
        this.renderFocusLens();
    }

    advance(seconds: number): void {
        if (document.hidden) return;
        this.#ticks++;
        this.simulation.advance(seconds);
        this.#playback?.advance(seconds);
        if (this.#playback?.done) {
            this.#playback = undefined;
            this.clearDissolve();
        }
        decayActivity(this.#activity, seconds, Number(this.#resolved.values['salience.decayRate']));
        this.#visionTime += seconds;
        if (this.#visionTime >= 0.4) {
            this.#visionTime = 0;
            if (this.#visionLoopEnabled) this.runVisionLoop();
            else this.sampleVision();
        }
        this.#minimapTime += seconds;
        if (this.#minimapTime >= 0.2) {
            this.#minimapTime = 0;
            this.renderMinimap();
        }
        this.renderPositions();
        this.#fps = lerp(this.#fps, seconds > 0 ? 1 / seconds : 0, 0.15);
        this.renderHud();
        this.syncClock();
    }

    settle(): void {
        this.simulation.settle();
        this.#playback?.finish();
        this.#playback = undefined;
        this.clearDissolve();
        this.#activity.clear();
        this.renderPositions();
    }

    reveal(id: string): void {
        const node = this.#view.nodes.find((candidate) => candidate.id === id);
        if (!node) return;
        this.#revealed = id;
        this.recordEvent('reveal', {
            target: id,
            kind: node.kind,
            choices: this.#controller.connections(id).length,
        });
        this.#trail.push({ id, label: node.label, kind: node.kind });
        this.renderPortalCrumb();
        this.renderer.setSelection([id]);
        const qualified = this.#qualifiedByNode.get(id);
        if (this.#pinnedReveal && this.#pinnedReveal !== qualified)
            this.simulation.unpin([this.#pinnedReveal]);
        if (qualified) this.simulation.pin([qualified]);
        this.#pinnedReveal = qualified;
        if (typeof location !== 'undefined') location.hash = `graph:${id}`;
        const row = document.querySelector<HTMLElement>(
            `#transcript-list .transcript-row[data-node="${CSS.escape(id)}"]`,
        );
        for (const selected of document.querySelectorAll('[data-revealed="true"]')) {
            selected.setAttribute('data-revealed', 'false');
        }
        if (row) {
            row.setAttribute('data-revealed', 'true');
            row.scrollIntoView({
                block: 'nearest',
                behavior: this.#reducedMotion ? 'instant' : 'smooth',
            });
        }
        this.renderAnnotationTarget();
        if (this.#model) this.renderMinimap();
    }

    trailBack(): string | undefined {
        const current = this.#trail.back();
        if (current) {
            this.recordEvent('trail-backtrack', { target: current.id });
            this.reveal(current.id);
        }
        return current?.id;
    }

    trailForward(): string | undefined {
        const current = this.#trail.forward();
        if (current) this.reveal(current.id);
        return current?.id;
    }

    trailTo(id: string): void {
        const target = this.#trail.entries.findIndex((entry) => entry.id === id);
        if (target < 0) return;
        while (this.#trail.depth - 1 > target) this.#trail.back();
        while (this.#trail.depth - 1 < target) this.#trail.forward();
        this.reveal(id);
    }

    /** B1 `traverse`: cross a relationship spatially, reusing the existing `flyTo` camera verb. */
    traverseEdge(edgeID: string): string | undefined {
        const edge = this.#view.edges.find((candidate) => candidate.id === edgeID);
        if (!edge) return undefined;
        const target = this.#positions.get(edge.target);
        this.recordEvent('traverse', { edge: edgeID, target: edge.target });
        this.reveal(edge.target);
        if (target) this.flyToPosition(target, edge.target);
        return edge.target;
    }

    /** B1/B2 `descend`: reveal the next portal and animate its frame origin through the parent. */
    descend(): string | undefined {
        const current = this.#revealed ? this.#portalByNode.get(this.#revealed) : undefined;
        const portals = [...this.#portalByNode].map(([id, scope]) => ({ id, scope }));
        const next =
            portals.find(
                (portal) =>
                    current === undefined ||
                    (portal.scope !== current && portal.scope.startsWith(`${current}/`)),
            ) ?? portals[0];
        if (!next) return undefined;
        this.recordEvent('descend', { scope: next.scope, target: next.id });
        this.reveal(next.id);
        const frame = this.simulation.view().frames.get(next.scope);
        if (frame) this.flyToPosition(frame.origin);
        this.markDissolve(next.scope);
        return next.id;
    }

    /** B1 `ascend`: step to the parent scope's portal, or home at the root. */
    ascend(): string | undefined {
        const scope = this.#revealed ? this.#portalByNode.get(this.#revealed) : undefined;
        if (!scope) {
            this.returnHome();
            return undefined;
        }
        const chain = portalChain(scope, this.#specs);
        const parent = chain.at(-2);
        const portal = parent
            ? [...this.#portalByNode].find(([, child]) => child === parent)?.[0]
            : undefined;
        this.recordEvent('ascend', { scope, parent: parent ?? '' });
        if (!portal) {
            this.returnHome();
            return undefined;
        }
        this.reveal(portal);
        const frame = this.simulation.view().frames.get(parent!);
        if (frame) this.flyToPosition(frame.origin);
        return portal;
    }

    /** B1 `return`: one keystroke back to the familiar hybrid view. */
    returnHome(): void {
        this.recordEvent('escape-hatch', { from: this.#revealed });
        this.#playback?.finish();
        this.#playback = undefined;
        this.clearDissolve();
        this.setKnob('surface.mode', 'hybrid');
        this.renderer.setSelection([]);
        this.renderer.setViewport({ zoom: 1, center: [0, 0, 0] });
        this.#revealed = '';
        this.renderPortalCrumb();
        this.renderHud();
        this.paint();
    }

    /** Center on nodes using the one position authority; zoom is applied in the same viewport write. */
    frame(
        ids: readonly string[],
        options: { zoom?: number; minScale?: number; padding?: number } = {},
    ): void {
        if (!ids.length) return;
        if (options.minScale !== undefined) {
            this.renderer.fit(ids, { minScale: options.minScale, padding: options.padding ?? 0 });
            return;
        }
        const points = ids
            .map((id) => this.#positions.get(id))
            .filter((point): point is Position => Boolean(point));
        if (!points.length) return;
        const center = points.reduce(
            (sum, point) =>
                [sum[0] + point.x, sum[1] + point.y, sum[2] + point.z] as [number, number, number],
            [0, 0, 0] as [number, number, number],
        );
        const count = points.length;
        this.renderer.setViewport({
            zoom: options.zoom ?? this.renderer.getViewport().zoom,
            center: [center[0] / count, center[1] / count, center[2] / count],
        });
        this.renderMinimap();
        this.paint();
    }

    /** Apply a named, deterministic view. A shot is URL data, never a renderer branch. */
    applyShot(idOrShot: string | Shot): boolean {
        const shot = typeof idOrShot === 'string' ? shotById(idOrShot) : idOrShot;
        if (!shot) return false;
        this.#shotReady = false;
        if (shot.surface) this.setSurface(shot.surface);
        if (shot.arrangement) this.setArrangement(shot.arrangement);
        if (shot.collapsed !== undefined && this.#transcriptCollapsed !== shot.collapsed)
            this.toggleTranscript();
        if (shot.level) this.setLevel(shot.level);
        if (shot.reveal) this.reveal(shot.reveal);
        if (shot.evidence) this.run(shot.evidence);
        if (shot.expandFirst) document.querySelector<HTMLElement>('.spine-expand')?.click();
        if (shot.catalog) {
            this.toggleCatalog(true);
            const catalogPanel = document.getElementById('catalog-panel');
            if (catalogPanel instanceof HTMLDetailsElement) catalogPanel.open = true;
            const aside = document.querySelector('aside');
            const catalog = document.getElementById('catalog');
            if (aside && catalog) aside.scrollTop = catalog.offsetTop - 20;
            document.querySelector<HTMLElement>("#catalog .catalog-card[data-card='experiment'] > summary")?.click();
        }
        if (shot.panel && document.getElementById('policy-section') instanceof HTMLDetailsElement)
            (document.getElementById('policy-section') as HTMLDetailsElement).open = true;
        const ids = shot.frame?.length
            ? shot.frame
            : (this.#model?.nodes.filter((node) => node.visible !== false).map((node) => node.id) ??
              []);
        if (shot.minScale !== undefined)
            this.frame(ids, { minScale: shot.minScale, padding: shot.padding });
        else if (shot.frame?.length || shot.zoom !== undefined)
            this.frame(ids, { zoom: shot.zoom });
        this.paint();
        this.#shotReady = true;
        return true;
    }

    ergonomics(): Readonly<Record<string, number>> {
        return ergonomicProfile(this.recording());
    }

    private markDissolve(scope: string): void {
        this.#dissolving = scope;
        this.paint();
    }

    private clearDissolve(): void {
        if (!this.#dissolving) return;
        this.#dissolving = undefined;
        this.paint();
    }

    private flyToPosition(target: Position, traceID?: string): void {
        this.#flightFrom = this.renderer.getViewport();
        this.#flightTo = target;
        const values = this.#resolved.values;
        const traceSeconds = Number(values['camera.traceMs']) / 1000;
        const steps = [
            ...(traceID
                ? [
                      {
                          id: `trace:${traceID}`,
                          verb: 'trace' as const,
                          target: 'emphasis' as const,
                          from: 0,
                          to: 1,
                          duration: traceSeconds,
                      },
                  ]
                : []),
            {
                id: `flyTo:${traceID ?? 'scope'}`,
                verb: 'flyTo' as const,
                target: 'camera' as const,
                from: 0,
                to: 1,
                duration: Number(values['camera.verbMs']) / 1000,
                delay: traceID ? traceSeconds / 2 : 0,
            },
        ];
        this.#playback = this.director.play(steps, {
            ease: 'power2.inOut',
            reducedMotion: this.#reducedMotion,
        });
        this.syncClock();
    }

    setFollow(mode: FollowMode): FollowMode {
        if (!FOLLOW_MODES.includes(mode)) return this.#followMode;
        this.#followMode = mode;
        this.#lastFollowFrame = null;
        el<HTMLSelectElement>('follow-mode').value = mode;
        this.renderFollow();
        return mode;
    }

    setDepth(mode: DepthMode): DepthMode {
        if (!supportsDepth(this.renderer.capabilities, mode)) return this.#depth;
        this.setKnob('depth.mode', mode);
        return this.#depth;
    }

    setDepthAxis(axis: DepthAxis): DepthAxis {
        this.#depthAxis = axis;
        this.paint();
        return axis;
    }

    setLevel(level: AgentLevel): LevelMode {
        if (!LEVELS.includes(level)) return this.#levelMode;
        this.#levelMode = level;
        this.applyLevel(level);
        return level;
    }

    setLevelMode(mode: LevelMode): LevelMode {
        if (!LEVEL_MODES.includes(mode)) return this.#levelMode;
        this.#levelMode = mode;
        el<HTMLSelectElement>('level-mode').value = mode;
        if (mode !== 'auto') this.applyLevel(mode);
        return mode;
    }

    setLaneScope(id: string): string {
        this.#laneScope = id;
        this.refresh();
        return id;
    }

    setWindowSize(size: number): number {
        this.setKnob('guardrails.window', Math.max(1, Math.floor(size)));
        return this.#windowSize;
    }

    /** Explicit host toggle: no analysis or retargeting happens until this is enabled. */
    setVisionLoop(enabled: boolean): boolean {
        this.#visionLoopEnabled = enabled;
        el('vision-loop-toggle').setAttribute('data-active', String(enabled));
        if (enabled) this.runVisionLoop();
        this.renderVisionLoop();
        return enabled;
    }

    setArrangement(arrangement: Arrangement): Arrangement {
        if (!ARRANGEMENTS.includes(arrangement)) return this.#arrangement;
        this.setKnob('surface.arrangement', arrangement);
        return this.#arrangement;
    }

    setSurface(surface: Surface): Surface {
        if (!SURFACES.includes(surface)) return this.#surface;
        this.setKnob('surface.mode', surface);
        return this.#surface;
    }

    play(preset: GravityPreset = 'zero-g'): boolean {
        const active = this.playSession.play(preset);
        this.simulation.setSignals(this.simulation.signals);
        el('play-start').setAttribute('data-active', String(active));
        this.syncClock();
        return active;
    }

    reconcilePlay(): boolean {
        const settled = this.playSession.reconcile();
        el('play-start').setAttribute('data-active', 'false');
        this.renderPositions();
        this.renderHud();
        this.syncClock();
        return settled;
    }

    pan(dx: number, dy: number): void {
        const viewport = this.renderer.getViewport();
        this.renderer.setViewport({
            ...viewport,
            center: [viewport.center[0] - dx, viewport.center[1] - dy, viewport.center[2]],
        });
        this.renderMinimap();
    }

    zoomBy(factor: number): number {
        const viewport = this.renderer.getViewport();
        const zoom = Math.max(0.1, Math.min(6, viewport.zoom * factor));
        this.renderer.setViewport({ ...viewport, zoom });
        this.renderMinimap();
        const direction = Math.sign(factor - 1);
        if (direction && this.#lastZoomDirection && direction !== this.#lastZoomDirection) {
            this.#zoomOscillations++;
            this.recordEvent('zoom-oscillation', { reversals: this.#zoomOscillations });
        }
        if (direction) this.#lastZoomDirection = direction;
        return zoom;
    }

    pinNote(target: string, body: string): PinnedNote | undefined {
        const text = body.trim();
        if (!text || !this.#view.nodes.some((node) => node.id === target)) return undefined;
        const note = this.#notes.add(target, text);
        this.paint();
        return note;
    }

    removeNote(id: string): void {
        if (this.#notes.remove(id)) this.paint();
    }

    report(): string {
        return buildReportHTML({
            title: 'Pi spatial argument',
            permalink: this.permalink(),
            json: this.exportModel('json'),
            svg: this.exportModel('svg'),
            html: this.exportModel('html'),
            annotations: this.#notes.list,
        });
    }

    downloadReport(): void {
        downloadBlob(
            new Blob([this.report()], { type: 'text/html' }),
            `pi-report-${Date.now()}.html`,
        );
    }

    permalink(): string {
        const viewport = this.renderer.getViewport();
        const state: PermalinkState = {
            surface: this.#surface,
            arrangement: this.#arrangement,
            depth: this.#depth,
            depthAxis: this.#depthAxis,
            level: this.#levelMode,
            focus: this.#revealed,
            viewport: {
                zoom: viewport.zoom,
                center: [...viewport.center] as [number, number, number],
            },
            filter: this.#laneScope,
            annotations: this.#notes.list,
            policy: encodePolicyVector(POLICY_SCHEMA, this.#resolved.values),
            fixture: FIXTURE_ID,
        };
        return encodePermalink(state);
    }

    applyPermalink(hash: string): boolean {
        const state = decodePermalink(hash);
        if (!state) return false;
        const url: Record<string, string | number | boolean> = {
            ...(state.policy ? (decodePolicyVector(POLICY_SCHEMA, state.policy) ?? {}) : {}),
        };
        if (SURFACES.includes(state.surface as Surface)) url['surface.mode'] = state.surface;
        if (ARRANGEMENTS.includes(state.arrangement as Arrangement))
            url['surface.arrangement'] = state.arrangement;
        if (supportsDepth(this.renderer.capabilities, state.depth as DepthMode))
            url['depth.mode'] = state.depth;
        this.#policyLayers.panel = {};
        this.setPolicyLayer('url', url);
        this.setDepthAxis(state.depthAxis as DepthAxis);
        this.setLevelMode(state.level as LevelMode);
        this.setLaneScope(state.filter);
        if (state.focus) this.reveal(state.focus);
        this.renderer.setViewport({
            zoom: state.viewport.zoom,
            center: [...state.viewport.center] as [number, number, number],
        });
        this.#notes.replaceAll(state.annotations ?? []);
        this.paint();
        return true;
    }

    exportModel(format: 'json' | 'svg' | 'html'): string {
        if (format === 'json') return exportJSON(this.#kernel);
        if (format === 'svg') return exportSVG(this.#view, this.#positions);
        return exportHTML(this.#view, this.#positions);
    }

    run(id: string): readonly string[] {
        const lines = runCapability(id, this.context());
        this.recordEvent(
            lines.some((line) => /fail|error|unsupported/i.test(line)) ? 'wrong-turn' : 'answer',
            {
                capability: id,
            },
        );
        this.showEvidence(lines);
        return lines;
    }

    setClientID(id: string): void {
        this.#clientID = id;
    }

    /** C2 prompt/steer: one seam for the form and every graph affordance; transcript parity is mandatory. */
    async sendPrompt(
        text: string,
        mode?: 'steer' | 'followUp',
    ): Promise<{ ok: boolean; error?: string }> {
        const prompt = text.trim();
        if (!prompt) return { ok: false, error: 'empty prompt' };
        this.recordEvent(mode ?? 'prompt', { text: prompt.slice(0, 120) });
        try {
            const response = await fetch('/prompt', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    client: this.#clientID,
                    text: prompt,
                    mode: mode || undefined,
                }),
            });
            if (!response.ok) {
                const body = (await response.json()) as { error?: string };
                const error = body.error ?? `prompt failed (${response.status})`;
                this.showEvidence([`prompt: ${error}`]);
                return { ok: false, error };
            }
            this.showEvidence([`prompt${mode ? ` · ${mode}` : ''}: ${prompt}`]);
            return { ok: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.showEvidence([`prompt: ${message}`]);
            return { ok: false, error: message };
        }
    }

    /** C2 approval: a first-class node plus a `gates` edge, using only the six kernel ops. */
    approve(target: string, decision: 'approve' | 'reject'): string | undefined {
        if (!this.#view.nodes.some((node) => node.id === target)) return undefined;
        const id = `approval:${target}:${this.#kernel.nodes.length + 1}`;
        const status = decision === 'approve' ? 'approved' : 'rejected';
        this.consume({
            op: 'add-node',
            node: { id, kind: 'approval', label: `${decision} · ${target}`, data: { status } },
        });
        this.consume({
            op: 'add-edge',
            edge: { id: `gates:${id}`, kind: 'gates', source: id, target },
        });
        this.recordEvent(decision, { target, node: id });
        this.showEvidence([`${decision}: ${target}`]);
        return id;
    }

    /** C2 retry: synthesise a retry action and its edge over the existing kernel seam. */
    retry(target: string): string | undefined {
        if (!this.#view.nodes.some((node) => node.id === target)) return undefined;
        const id = `retry:${target}`;
        this.consume({
            op: 'add-node',
            node: { id, kind: 'action', label: `retry ${target}`, data: { status: 'pending' } },
        });
        this.consume({
            op: 'add-edge',
            edge: { id: `retry-edge:${id}`, kind: 'retry', source: target, target: id },
        });
        this.recordEvent('retry', { target, node: id });
        this.showEvidence([`retry: ${target}`]);
        return id;
    }

    /** C2 compare runs: diff the captured baseline against the live kernel; no library change. */
    compareRuns(): readonly string[] {
        const diff = diffKernels(this.#baselineKernel, this.#kernel);
        const lines = [
            `runs: baseline ${this.#baselineKernel.nodes.length} nodes → live ${this.#kernel.nodes.length} nodes`,
            `added ${diff.nodes.added.length} · removed ${diff.nodes.removed.length} · changed ${diff.nodes.changed.length} nodes`,
            `added ${diff.edges.added.length} · removed ${diff.edges.removed.length} · changed ${diff.edges.changed.length} edges`,
            ...diff.nodes.added.slice(0, 3).map((node) => `+ ${node.id}`),
            ...diff.nodes.removed.slice(0, 3).map((node) => `- ${node.id}`),
        ];
        this.recordEvent('compare-runs', {
            added: diff.nodes.added.length,
            removed: diff.nodes.removed.length,
        });
        this.showEvidence(lines);
        return lines;
    }

    captureBaseline(): void {
        this.#baselineKernel = this.#kernel;
    }

    private instrumentData(node: RenderNode): InstrumentData {
        const data = node.data ?? {};
        return {
            series: [
                this.#activity.get(node.id) ?? 0,
                this.#vision.legibility,
                1 - this.#vision.overlap,
            ],
            value: node.emphasis ?? 0,
            status: String(data.status ?? node.status ?? 'idle'),
            lines: typeof data.detail === 'string' ? data.detail.split('\n').slice(0, 3) : [],
            tabs: ['overview', 'actions', 'artifacts'],
            actions: ['steer', 'followUp', 'approve', 'reject', 'retry'],
        };
    }

    private onInstrumentAction(action: string, node: RenderNode): void {
        if (action === 'steer' || action === 'followUp') {
            el<HTMLSelectElement>('prompt-mode').value = action;
            el<HTMLInputElement>('prompt-input').focus();
            this.recordEvent('steer-affordance', { action, target: node.id });
            return;
        }
        if (action === 'approve' || action === 'reject') this.approve(node.id, action);
        if (action === 'retry') this.retry(node.id);
    }

    private focusPrimary(): void {
        const target =
            this.#controller.selection[0] ??
            this.#revealed ??
            this.#model?.nodes.find((node) => node.visible !== false)?.id;
        if (!target) return;
        this.reveal(target);
        this.#inspector?.setTab('detail');
    }

    private commands(): readonly Command[] {
        const nav: readonly Command[] = [
            {
                id: 'nav.reveal',
                label: 'Reveal selection',
                group: 'navigate',
                hint: 'Enter',
                run: () => this.focusPrimary(),
            },
            {
                id: 'nav.descend',
                label: 'Descend into scope',
                group: 'navigate',
                hint: 'PgDn',
                run: () => this.descend(),
            },
            {
                id: 'nav.ascend',
                label: 'Ascend from scope',
                group: 'navigate',
                hint: 'PgUp',
                run: () => this.ascend(),
            },
            {
                id: 'nav.trace',
                label: 'Trace a path',
                group: 'navigate',
                hint: 't',
                run: () => this.#revealed && this.trace(this.#revealed),
            },
            {
                id: 'nav.survey',
                label: 'Survey the graph',
                group: 'navigate',
                hint: 's',
                run: () => this.survey(),
            },
            {
                id: 'nav.home',
                label: 'Return home',
                group: 'navigate',
                hint: 'Home',
                run: () => this.returnHome(),
            },
        ];
        const chrome: readonly Command[] = [
            {
                id: 'ui.catalog',
                label: 'Toggle catalog',
                group: 'interface',
                run: () => this.toggleCatalog(),
            },
            {
                id: 'ui.rail',
                label: 'Toggle rail',
                group: 'interface',
                run: () => this.toggleRail(),
            },
            {
                id: 'ui.transcript',
                label: 'Toggle transcript',
                group: 'interface',
                run: () => this.toggleTranscript(),
            },
            {
                id: 'ui.pin',
                label: 'Toggle inspector pin',
                group: 'interface',
                run: () => this.#inspector?.setPinned(!this.#inspector.pinned),
            },
            ...INSPECTOR_TABS.map((tab) => ({
                id: `ui.tab.${tab}`,
                label: `Inspector · ${tab}`,
                group: 'interface',
                run: () => this.#inspector?.setTab(tab),
            })),
            {
                id: 'ui.share',
                label: 'Share exact view',
                group: 'interface',
                run: () => {
                    location.hash = this.permalink().slice(1);
                    void navigator.clipboard?.writeText(location.href).catch(() => undefined);
                },
            },
        ];
        const verbs = CAPABILITIES.map((capability) => ({
            id: `verb.${capability.id}`,
            label: capability.summary,
            group: 'verb',
            hint: capability.id,
            run: () => this.run(capability.id),
        }));
        const knobs = POLICY_SCHEMA.knobs.flatMap<Command>((knob) => {
            const set = (value: string | number | boolean): Command => ({
                id: `knob.${knob.id}=${String(value)}`,
                label: `${knob.id} = ${String(value)}`,
                group: knob.family,
                hint: 'knob',
                run: () => this.setKnob(knob.id, value),
            });
            return knob.type === 'enum'
                ? knob.options.map(set)
                : knob.type === 'boolean'
                  ? [set(!Boolean(this.#resolved.values[knob.id]))]
                  : [set(knob.default), set(knob.min), set(knob.max)];
        });
        return [...nav, ...chrome, ...verbs, ...knobs];
    }

    private help(): readonly Command[] {
        return [
            {
                id: 'help.palette',
                label: 'Open the command palette',
                group: 'shortcut',
                hint: '/',
                run: () => this.#commandSurface?.open('palette'),
            },
            {
                id: 'help.commands',
                label: 'Open commands and knobs',
                group: 'shortcut',
                hint: ':',
                run: () => this.#commandSurface?.open('commands'),
            },
            {
                id: 'help.help',
                label: 'Show this help',
                group: 'shortcut',
                hint: '?',
                run: () => this.#commandSurface?.open('help'),
            },
            {
                id: 'help.reveal',
                label: 'Reveal the selected node',
                group: 'shortcut',
                hint: 'Enter',
            },
            {
                id: 'help.descend',
                label: 'Descend / ascend a scope',
                group: 'shortcut',
                hint: 'PgDn / PgUp',
            },
            { id: 'help.trace', label: 'Trace a path', group: 'shortcut', hint: 't' },
            { id: 'help.survey', label: 'Survey the graph', group: 'shortcut', hint: 's' },
            {
                id: 'help.home',
                label: 'Return home, close the surface',
                group: 'shortcut',
                hint: 'Home / Esc',
            },
            { id: 'help.pan', label: 'Pan and zoom', group: 'shortcut', hint: 'arrows / +−' },
            { id: 'help.focus', label: 'Center the focused node', group: 'shortcut', hint: 'f' },
        ];
    }

    hooks(): Record<string, unknown> {
        return {
            capabilities: () => CAPABILITIES.map((capability) => capability.id),
            run: (id: string) => this.run(id),
            policy: () => this.policy,
            setKnob: (id: string, value: string | number | boolean, layer?: PolicyLayer) =>
                this.setKnob(id, value, layer),
            setPolicyLayer: (layer: PolicyLayer, values: PolicyVector) =>
                this.setPolicyLayer(layer, values),
            experiments: () => POLICY_EXPERIMENTS,
            sampleExperiment: (id: string) => {
                const experiment = experimentById(id);
                return experiment ? sampleExperiment(POLICY_SCHEMA, experiment) : undefined;
            },
            measureExperiment: (id: string, incumbent?: PolicyVector) => {
                const experiment = experimentById(id);
                return experiment
                    ? measureExperiment(
                          sampleExperiment(POLICY_SCHEMA, experiment),
                          this.recording(),
                          this.#eventScorer,
                          incumbent ?? this.#resolved.vector,
                          simulateAndScore,
                      )
                    : undefined;
            },
            experimentReportMarkdown,
            exportOnlineOutcomes: () => exportOnlineOutcomes(this.recording()),
            assignExperiment: (cell: ExperimentCell) => this.assignExperiment(cell),
            onPolicyChange: (listener: (event: PolicyChangeEvent) => void) =>
                this.onPolicyChange(listener),
            recording: () => this.recording(),
            recordEvent: (kind: string, meta?: Record<string, string | number | boolean>) =>
                this.recordEvent(kind, meta),
            replayRecording: (policy?: PolicyVector) => this.replayRecording(policy),
            replaySimulated: (policy?: PolicyVector) =>
                simulateAndScore(
                    this.recording(),
                    policy ?? this.#resolved.vector,
                    this.#eventScorer,
                ),
            counterfactual: (variant: PolicyVector, incumbent?: PolicyVector) =>
                this.counterfactual(variant, incumbent),
            ergonomics: () => this.ergonomics(),
            transcriptCollapsed: () => this.#transcriptCollapsed,
            toggleTranscript: () => this.toggleTranscript(),
            toggleCatalog: (open?: boolean) => this.toggleCatalog(open),
            toggleRail: (open?: boolean) => this.toggleRail(open),
            openCommands: (mode?: CommandMode) => this.#commandSurface?.open(mode),
            closeCommands: () => this.#commandSurface?.close(),
            commandMode: () => this.#commandSurface?.mode,
            commandCount: () => this.commands().length,
            focusPrimary: () => this.focusPrimary(),
            setInspectorTab: (tab: InspectorTab) => this.#inspector?.setTab(tab),
            inspectorTab: () => this.#inspector?.tab,
            setInspectorPinned: (pinned: boolean) => this.#inspector?.setPinned(pinned),
            inspectorPinned: () => this.#inspector?.pinned,
            railInstruments: () =>
                el('instrument-kit').querySelectorAll('[data-instrument-for]').length,
            transcriptSize: () =>
                this.#arrangement === 'stacked' ? this.#transcriptHeight : this.#transcriptWidth,
            edges: () => this.#view.edges.map((edge) => ({ id: edge.id, target: edge.target })),
            traverseEdge: (id: string) => this.traverseEdge(id),
            descend: () => this.descend(),
            ascend: () => this.ascend(),
            survey: () => this.survey(),
            returnHome: () => this.returnHome(),
            setClientID: (id: string) => this.setClientID(id),
            setFrame: (state: FrameState | null, detail?: string) => this.setFrame(state, detail),
            sendPrompt: (text: string, mode?: 'steer' | 'followUp') => this.sendPrompt(text, mode),
            approve: (target: string, decision: 'approve' | 'reject' = 'approve') =>
                this.approve(target, decision),
            reject: (target: string) => this.approve(target, 'reject'),
            retry: (target: string) => this.retry(target),
            compareRuns: () => this.compareRuns(),
            captureBaseline: () => this.captureBaseline(),
            instruments: () => document.querySelectorAll('[data-instrument-for]').length,
            evidence: () => this.#evidence,
            ops: () => this.#kernel.nodes.length,
            loadFixture: () => {
                this.#kernel = fixtureKernel();
                this.refresh();
                this.renderTranscript();
                this.renderTurnMap();
                this.simulation.settle();
                this.renderPositions();
                return this.#kernel.nodes.length;
            },
            follow: () => this.#followMode,
            setFollow: (mode: FollowMode) => this.setFollow(mode),
            followFrame: () => this.#lastFollowFrame,
            attention: () => this.#attention,
            scopes: () => this.#specs.map((spec) => spec.id),
            scopeSpecs: () => this.#specs,
            simulation: () => ({
                settled: this.simulation.settled,
                energy: this.simulation.energy,
                steps: this.simulation.steps,
                heat: this.simulation.heat,
                pinned: [...this.simulation.pinned],
            }),
            depth: () => this.#depth,
            setDepth: (mode: DepthMode) => this.setDepth(mode),
            depthAxis: () => this.#depthAxis,
            setDepthAxis: (axis: DepthAxis) => this.setDepthAxis(axis),
            level: () => this.#level,
            levelMode: () => this.#levelMode,
            setLevel: (level: AgentLevel) => this.setLevel(level),
            setLevelMode: (mode: LevelMode) => this.setLevelMode(mode),
            budgets: () => ({
                overview: Number(this.#resolved.values['guardrails.overviewCards']),
                execution: Number(this.#resolved.values['guardrails.executionCards']),
                detail: Number(this.#resolved.values['guardrails.detailCards']),
            }),
            laneScope: () => this.#laneScope,
            setLaneScope: (id: string) => this.setLaneScope(id),
            windowSize: () => this.#windowSize,
            setWindowSize: (size: number) => this.setWindowSize(size),
            hidden: () => this.#hidden,
            arrangement: () => this.#arrangement,
            setArrangement: (arrangement: Arrangement) => this.setArrangement(arrangement),
            surface: () => this.#surface,
            setSurface: (surface: Surface) => this.setSurface(surface),
            reveal: (id: string) => this.reveal(id),
            revealed: () => this.#revealed,
            trail: () => ({
                entries: this.#trail.entries.map((entry) => entry.id),
                current: this.#trail.current?.id,
                canGoBack: this.#trail.canGoBack,
                canGoForward: this.#trail.canGoForward,
            }),
            trailBack: () => this.trailBack(),
            trailForward: () => this.trailForward(),
            portalNodes: () => [...this.#portalByNode.keys()],
            portalScope: () =>
                this.#revealed ? this.#portalByNode.get(this.#revealed) : undefined,
            portalChain: () => this.portalCrumb(),
            minimap: () => ({
                dots: el('minimap').querySelectorAll('[data-minimap-node]').length,
                viewRect: Boolean(el('minimap').querySelector('[data-minimap-view]')),
            }),
            trace: (id: string) => this.trace(id),
            tracePath: () => this.#traceIds,
            traceProgress: () => this.#traceProgress,
            clearTrace: () => this.clearTrace(),
            walkthrough: () => this.walkthrough(),
            replay: () => this.replay(),
            positionOf: (id: string) => this.#positions.get(id),
            advance: (seconds: number) => this.advance(seconds),
            settle: () => this.settle(),
            paint: () => this.paint(),
            pause: (value: boolean) => {
                this.#paused = value;
                return this.#paused;
            },
            clock: () => this.#clock,
            ticks: () => this.#ticks,
            fps: () => this.#fps,
            vision: () => this.#vision,
            visionStrategy: () => this.#visionStrategy,
            setVisionLoop: (enabled: boolean) => this.setVisionLoop(enabled),
            visionLoop: () => ({
                enabled: this.#visionLoopEnabled,
                strategy: this.visionLoop().strategy,
                report: this.#visionReport,
                unsupported: this.visionLoop().reportUnsupported(),
            }),
            runVisionLoop: () => this.runVisionLoop(),
            cameraMotion: () => ({
                verbs: this.cameraMotion.verbs,
                unsupported: this.cameraMotion.reportUnsupported(),
            }),
            play: (preset?: GravityPreset) => this.play(preset),
            reconcilePlay: () => this.reconcilePlay(),
            playSession: () => ({
                active: this.playSession.active,
                preset: this.playSession.preset,
                energy: this.playSession.energy,
            }),
            activity: () => [...this.#activity.keys()],
            viewport: () => this.renderer.getViewport(),
            setViewport: (viewport: RendererViewport) => this.renderer.setViewport(viewport),
            frame: (
                ids: readonly string[],
                options?: { zoom?: number; minScale?: number; padding?: number },
            ) => this.frame(ids, options),
            shots: () => SHOTS,
            applyShot: (id: string) => this.applyShot(id),
            shotReady: () => this.#shotReady,
            pan: (dx: number, dy: number) => this.pan(dx, dy),
            zoomBy: (factor: number) => this.zoomBy(factor),
            export: (format: 'json' | 'svg' | 'html') => this.exportModel(format),
            pinNote: (target: string, body: string) => this.pinNote(target, body),
            notes: () => this.#notes.list,
            removeNote: (id: string) => this.removeNote(id),
            report: () => this.report(),
            permalink: () => this.permalink(),
            applyPermalink: (hash: string) => this.applyPermalink(hash),
            unsupported: () => unsupportedSeams(),
            motion: () => ({ verbs: this.director.verbs(), active: this.#playback?.active ?? [] }),
            ready: true,
        };
    }

    private band(): number {
        return this.#level === 'overview' ? 0 : this.#level === 'detail' ? 2 : 1;
    }

    private context() {
        return capabilityContext(
            this.#kernel,
            this.#view,
            this.#theme,
            { mode: this.#followMode, frame: this.#lastFollowFrame?.nodeId ?? 'none' },
            this.state(),
        );
    }

    private state(): PiHostState {
        return {
            projection: this.#projection,
            depth: this.#depth,
            depthSupported: supportsDepth(this.renderer.capabilities, this.#depth),
            level: this.#level,
            arrangement: this.#arrangement,
            scopes: this.#specs.length,
            simulation: {
                settled: this.simulation.settled,
                energy: this.simulation.energy,
                steps: this.simulation.steps,
            },
            motion: { verbs: this.director.verbs(), active: this.#playback?.active ?? [] },
            vision: this.#vision,
            visionLoop: {
                enabled: this.#visionLoopEnabled,
                strategy: this.visionLoop().strategy,
                retargeted: this.#visionReport?.retargeted ?? [],
            },
            activity: this.#activity.size,
            window: { size: this.#windowSize, hidden: this.#hidden },
        };
    }

    private simulatedPositions(): Map<string, Position> {
        const layout = this.simulation.view();
        const positions = new Map<string, Position>();
        const zoom = this.renderer.getViewport?.().zoom ?? 1;
        const distance = Math.max(400, 1200 / Math.max(0.2, zoom));
        const continuum = { mode: this.#depth, axis: this.#depthAxis, strength: 1, spread: 180 };
        const supports = supportsDepth(this.renderer.capabilities, this.#depth);
        for (const [qualified, position] of layout.positions) {
            const id = this.#nodeByQualified.get(qualified);
            if (!id) continue;
            const offset = supports
                ? sampleDepth(continuum, this.axisValue(id), distance).offset
                : 0;
            positions.set(id, { x: position.x, y: position.y, z: position.z + offset });
        }
        return positions;
    }

    private axisValue(id: string): number {
        const node = this.#view.nodes.find((candidate) => candidate.id === id);
        if (!node) return 0;
        if (this.#depthAxis === 'turn') {
            const turns = [...(this.#view.turns ?? [])];
            const unit = typeof node.data?.unitId === 'string' ? node.data.unitId : '';
            const index = turns.indexOf(unit);
            return turns.length > 1 ? (index < 0 ? 0 : index / (turns.length - 1)) : 0;
        }
        return (DEPTH[node.kind] ?? 2) / 4;
    }

    private sampleVision(): void {
        const next = scoreVision(this.#positions);
        const changed =
            Math.abs(next.overlap - this.#vision.overlap) > 0.12 ||
            Math.abs(next.legibility - this.#vision.legibility) > 0.1;
        if (!changed) return;
        this.#vision = next;
        this.simulation.setPolicy({
            band: this.band(),
            focus: this.#qualifiedByNode.get(this.#controller.selection[0] ?? this.#revealed),
            vision: next,
        });
        this.syncClock();
    }

    private visionLoop(): VisionLoop {
        if (!this.#visionLoop || this.#visionLoop.reportUnsupported().length) {
            this.#visionLoop = createVisionLoop(
                this.#global ? visionAnalyzers() : undefined,
                (input, scores) => this.applyVisionPolicy(input, scores),
            );
        }
        return this.#visionLoop;
    }

    private applyVisionPolicy(input: ScopePolicyInput, scores: VisionLoopScores): void {
        const previous = this.#vision.legibility;
        this.#vision = { overlap: scores.overlap, legibility: scores.legibility };
        this.simulation.setPolicy({
            ...input,
            band: this.band(),
            focus: this.#qualifiedByNode.get(this.#controller.selection[0] ?? this.#revealed),
        });
        // representationRung switches at 0.5 and 0.7; repaint only when legibility crosses one.
        if (
            previous < 0.5 !== scores.legibility < 0.5 ||
            previous < 0.7 !== scores.legibility < 0.7
        ) {
            this.paint();
        }
        this.syncClock();
    }

    private runVisionLoop(): void {
        if (!this.#visionLoopEnabled || this.#visionLoopBusy) return;
        this.#visionLoopBusy = true;
        void this.visionLoop()
            .cycle()
            .then((report) => {
                if (!report) return;
                this.#visionReport = report;
                this.renderVisionLoop();
            })
            .finally(() => {
                this.#visionLoopBusy = false;
            });
    }

    private renderVisionLoop(): void {
        const loop = this.visionLoop();
        const report = this.#visionReport;
        el('vision-loop-state').textContent = report
            ? `strategy ${loop.strategy} · overlap ${report.scores.overlap.toFixed(2)} · ` +
              `legibility ${report.scores.legibility.toFixed(2)} · hierarchy ${report.scores.hierarchy.toFixed(2)} · ` +
              `ergonomics ${report.scores.ergonomics.toFixed(2)} · retargeted ${report.retargeted.join(', ') || 'none'}`
            : `${this.#visionLoopEnabled ? 'analyzing…' : 'off'} · strategy ${loop.strategy}` +
              (loop
                  .reportUnsupported()
                  .map((item) => ` · ${item.reason}`)
                  .join('') || '');
    }

    private registerMotion(): CameraMotionHandlers {
        return createCameraMotionHandlers(this.director, {
            origin: () => [
                this.#flightFrom.center[0],
                this.#flightFrom.center[1],
                this.#flightFrom.center[2],
            ],
            destination: () => [this.#flightTo.x, this.#flightTo.y, this.#flightTo.z],
            zoom: () => this.#flightFrom.zoom,
            tracePath: () =>
                this.#tracePositions.map((position) => [position.x, position.y, position.z]),
            move: (verb, center, progress) => {
                if (verb === 'trace') this.#traceProgress = progress;
                this.renderer.setViewport({
                    center: [...center],
                    zoom:
                        verb === 'flyTo' ? this.#flightFrom.zoom : this.renderer.getViewport().zoom,
                });
                if (verb === 'trace') this.renderPositions();
            },
        });
    }

    trace(id: string): readonly string[] {
        this.recordEvent('trace', { target: id });
        return this.sweep(traceOrder(this.#view, id));
    }

    /** B1 `survey`: sweep the whole current scope with the same interruptible camera verb as trace. */
    survey(): readonly string[] {
        const ids = this.#view.nodes.map((node) => node.id);
        this.recordEvent('survey', { nodes: ids.length });
        return this.sweep(ids);
    }

    private sweep(ids: readonly string[]): readonly string[] {
        this.#playback?.finish();
        this.#playback = undefined;
        this.#traceIds = ids;
        this.#tracePositions = ids
            .map((nodeId) => this.#positions.get(nodeId))
            .filter((position): position is Position => Boolean(position));
        this.#traceProgress = 0;
        this.paint();
        const steps = this.#tracePositions.slice(1).map((_, index) => ({
            id: `trace:${index}`,
            verb: 'trace' as const,
            target: 'camera' as const,
            from: index,
            to: index + 1,
            duration: 0.35,
        }));
        if (steps.length) {
            this.#playback = this.director.play(steps, { reducedMotion: this.#reducedMotion });
        } else {
            this.renderPositions();
        }
        this.syncClock();
        return this.#traceIds;
    }

    /** Touch gestures dispatch to the same verbs as the keyboard; each verb records its own event. */
    private dispatchTouchVerb(verb: TouchVerb): void {
        if (verb === 'descend') this.descend();
        else if (verb === 'ascend') this.ascend();
        else if (verb === 'survey') this.survey();
        else if (verb === 'return') this.returnHome();
        else if (verb === 'trace' && this.#revealed) this.trace(this.#revealed);
        else if (verb === 'follow') this.setFollow(this.#followMode === 'off' ? 'node' : 'off');
    }

    clearTrace(): void {
        this.#traceIds = [];
        this.#tracePositions = [];
        this.#traceProgress = 0;
        this.paint();
        this.renderPositions();
    }

    /** The first-visit walkthrough: five questions × three surfaces, all from existing evidence. */
    walkthrough(): readonly string[] {
        return STUDY_TASKS.flatMap((task) => SURFACES.map((surface) => `${task.id} · ${surface}`));
    }

    /** Replays every question's evidence, then flies the trace across the changed artifacts. */
    replay(): readonly string[] {
        const lines = STUDY_TASKS.flatMap((task) => runCapability(task.id, this.context()));
        for (const node of this.#view.nodes
            .filter((candidate) => candidate.kind === 'artifact')
            .slice(0, 3)) {
            this.reveal(node.id);
            this.trace(node.id);
        }
        this.showEvidence(lines);
        return lines;
    }

    private follow(newNodes: readonly GraphNode[]): void {
        this.#lastFollowFrame = computeFollowFrame({
            newNodes,
            currentViewport: this.renderer.getViewport(),
            followMode: this.#followMode,
            positionOf: (id) => this.#positions.get(id),
        });
        const id = this.#lastFollowFrame?.nodeId;
        if (!id) return this.renderFollow();
        this.renderer.focus(id);
        const target = this.#positions.get(id);
        if (!target || this.#reducedMotion) return this.renderFollow();
        this.flyToPosition(target, id);
        this.renderFollow();
    }

    private applyAutoLevel(zoom: number): void {
        if (this.#levelMode !== 'auto') return;
        const values = this.#resolved.values;
        const next = levelForZoom(zoom, this.#level, {
            overviewMax: Number(values['bands.overviewMax']),
            overviewEnter: Number(values['bands.overviewEnter']),
            detailMin: Number(values['bands.detailMin']),
            detailExit: Number(values['bands.detailExit']),
        });
        if (next !== this.#level) this.applyLevel(next);
    }

    private applyLevel(level: AgentLevel): void {
        if (level === this.#level) return;
        this.#level = level;
        this.paint();
        this.renderHud();
    }

    private syncClock(): void {
        const moving = !this.simulation.settled;
        const flying = Boolean(this.#playback && !this.#playback.done);
        const active = this.#activity.size > 0;
        const playing = this.playSession.active && !this.simulation.settled;
        if (this.#clock && !moving && !flying && !active && !playing) this.#clock = false;
        if (!this.#clock && (moving || flying || active || playing) && !document.hidden) {
            this.#clock = true;
            this.#lastFrame = performance.now();
            requestAnimationFrame(this.tick);
        }
    }

    private tick = (time: number): void => {
        if (!this.#clock) return;
        const seconds = Math.min(0.05, Math.max(0, (time - this.#lastFrame) / 1000));
        this.#lastFrame = time;
        this.advance(seconds);
        if (this.#clock) requestAnimationFrame(this.tick);
    };

    private bindControls(): void {
        document.body.dataset.catalog ??= 'closed';
        document.body.dataset.rail ??= 'open';
        el('catalog-toggle').addEventListener('click', () => this.toggleCatalog());
        el('proof-line').addEventListener('click', () => this.toggleCatalog(true));
        el('rail-toggle').addEventListener('click', () => this.toggleRail());
        el('command-open').addEventListener('click', () => this.#commandSurface?.open('palette'));
        el('focus-primary').addEventListener('click', () => this.focusPrimary());
        document.addEventListener('keydown', (event) => {
            const target = event.target as HTMLElement | null;
            const editing = target?.closest('input, textarea, select, [contenteditable="true"]');
            if (editing && editing.id !== 'command-input') return;
            const mode =
                event.key === '/'
                    ? 'palette'
                    : event.key === ':'
                      ? 'commands'
                      : event.key === '?'
                        ? 'help'
                        : undefined;
            if (!mode) return;
            event.preventDefault();
            this.#commandSurface?.open(mode);
        });
        const follow = el<HTMLSelectElement>('follow-mode');
        follow.value = this.#followMode;
        follow.addEventListener('change', () => this.setFollow(follow.value as FollowMode));
        const depth = el<HTMLSelectElement>('depth-mode');
        depth.value = this.#depth;
        depth.addEventListener('change', () => this.setDepth(depth.value as DepthMode));
        el<HTMLSelectElement>('depth-axis').addEventListener('change', (event) =>
            this.setDepthAxis((event.target as HTMLSelectElement).value as DepthAxis),
        );
        const level = el<HTMLSelectElement>('level-mode');
        level.value = this.#levelMode;
        level.addEventListener('change', () => this.setLevelMode(level.value as LevelMode));
        el<HTMLSelectElement>('arrangement-mode').value = this.#arrangement;
        el<HTMLSelectElement>('arrangement-mode').addEventListener('change', (event) =>
            this.setArrangement((event.target as HTMLSelectElement).value as Arrangement),
        );
        for (const surface of SURFACES) {
            el(`surface-${surface}`).addEventListener('click', () => this.setSurface(surface));
        }
        for (const format of ['json', 'svg', 'html'] as const) {
            el(`export-${format}`).addEventListener('click', () => this.download(format));
        }
        const pin = (): void => {
            const input = el<HTMLInputElement>('annotation-input');
            if (this.pinNote(this.#revealed, input.value)) input.value = '';
        };
        el('annotation-add').addEventListener('click', pin);
        el<HTMLFormElement>('annotation-form').addEventListener('submit', (event) => {
            event.preventDefault();
            pin();
        });
        el('report-download').addEventListener('click', () => this.downloadReport());
        this.renderAnnotationTarget();
        el<HTMLSelectElement>('play-preset').addEventListener('change', (event) => {
            if (this.playSession.active)
                this.play((event.target as HTMLSelectElement).value as GravityPreset);
        });
        el('play-start').addEventListener('click', () =>
            this.play(el<HTMLSelectElement>('play-preset').value as GravityPreset),
        );
        el('play-reconcile').addEventListener('click', () => this.reconcilePlay());
        el('vision-loop-toggle').addEventListener('click', () =>
            this.setVisionLoop(!this.#visionLoopEnabled),
        );
        el('guided-replay').addEventListener('click', () => this.replay());
        el('trail-back').addEventListener('click', () => this.trailBack());
        el('trail-forward').addEventListener('click', () => this.trailForward());
        el('minimap').addEventListener('click', (event) => {
            const id = (event.target as Element | null)
                ?.closest('[data-minimap-node]')
                ?.getAttribute('data-minimap-node');
            if (id) this.reveal(id);
        });
        el('permalink-copy').addEventListener('click', () => {
            location.hash = this.permalink().slice(1);
            void navigator.clipboard?.writeText(location.href).catch(() => undefined);
        });
        const canvas = el('canvas');
        canvas.tabIndex = 0;
        canvas.addEventListener('keydown', (event) => this.onKey(event));
        this.applySurface();
        if (location.hash && !this.applyPermalink(location.hash) && isRevealHash(location.hash)) {
            this.reveal(decodeURIComponent(location.hash.slice('#graph:'.length)));
        }
    }

    private onKey(event: KeyboardEvent): void {
        const steps: Record<string, () => void> = {
            ArrowLeft: () => this.pan(80, 0),
            ArrowRight: () => this.pan(-80, 0),
            ArrowUp: () => this.pan(0, 80),
            ArrowDown: () => this.pan(0, -80),
            '+': () => this.zoomBy(1.2),
            '=': () => this.zoomBy(1.2),
            '-': () => this.zoomBy(1 / 1.2),
            f: () => this.#revealed && this.renderer.focus(this.#revealed),
            Enter: () =>
                this.#controller.selection[0] && this.reveal(this.#controller.selection[0]),
            PageDown: () => this.descend(),
            PageUp: () => this.ascend(),
            Home: () => this.returnHome(),
            t: () => this.#revealed && this.trace(this.#revealed),
            s: () => this.survey(),
            Escape: () => this.returnHome(),
        };
        const action = steps[event.key];
        if (!action) return;
        event.preventDefault();
        action();
    }

    private download(format: 'json' | 'svg' | 'html'): void {
        const blob = new Blob([this.exportModel(format)], {
            type:
                format === 'json'
                    ? 'application/json'
                    : format === 'svg'
                      ? 'image/svg+xml'
                      : 'text/html',
        });
        downloadBlob(blob, `pi-graph.${format}`);
    }

    private applySurface(): void {
        const main = el('surface');
        main.dataset.surface = this.#surface;
        main.dataset.arrangement = this.#arrangement;
        main.style.setProperty(
            '--transcript-size',
            `${this.#arrangement === 'stacked' ? this.#transcriptHeight : this.#transcriptWidth}px`,
        );
        for (const surface of SURFACES) {
            el(`surface-${surface}`).setAttribute('data-active', String(surface === this.#surface));
        }
    }

    /** One-shot framing at startup; later navigations keep the user's chosen view. */
    private fitView(): void {
        const ids =
            this.#model?.nodes.filter((node) => node.visible !== false).map((node) => node.id) ??
            [];
        if (ids.length) this.renderer.fit(ids, { padding: 60 });
    }

    /** Detail-card controls are host DOM; actions return through the same verbs as the HUD. */
    private bindNodeActions(): void {
        el('canvas').addEventListener('pointerdown', (event) => {
            if ((event.target as HTMLElement).closest('[data-node-action]'))
                event.stopPropagation();
        });
        el('canvas').addEventListener('click', (event) => {
            const button = (event.target as HTMLElement).closest<HTMLElement>('[data-node-action]');
            if (!button) return;
            event.stopPropagation();
            const target = button.dataset.target || this.#revealed;
            const action = button.dataset.nodeAction;
            if (target && action) this.handleNodeAction(action, target);
        });
    }

    private handleNodeAction(action: string, target: string): void {
        switch (action) {
            case 'focus':
                this.reveal(target);
                this.frame([target]);
                break;
            case 'trace':
                this.trace(target);
                break;
            case 'follow':
                this.setFollow(this.#followMode === 'off' ? ('node+focus' as FollowMode) : 'off');
                break;
            case 'approve':
            case 'reject':
                this.approve(target, action);
                break;
            case 'retry':
                this.retry(target);
                break;
        }
    }

    /** Dockable inspector anchored to the focused node; markup changes only with focus or data. */
    private renderFocusLens(): void {
        const inspector = this.#inspector;
        if (!inspector) return;
        const overlay = inspector.element;
        const depth = Number(this.#resolved.values['emphasis.innerDepth']);
        const focus = this.#revealed || this.#controller.selection[0] || '';
        if (!focus || depth <= 0) {
            overlay.hidden = true;
            this.#focusConnector?.parentElement?.toggleAttribute('hidden', true);
            return;
        }
        const point = this.renderer.getNodeScreenPosition?.(focus);
        const adapterNode = toAdapterModel(this.#view).nodes.find((node) => node.id === focus);
        const modelNode = this.#model?.nodes.find((node) => node.id === focus);
        if (!point || !adapterNode || !modelNode) {
            overlay.hidden = true;
            this.#focusConnector?.parentElement?.toggleAttribute('hidden', true);
            return;
        }
        const layout = String(this.#resolved.values['emphasis.innerLayout']) as InnerLayout;
        const scope = this.#portalByNode.get(focus);
        document.documentElement.dataset.scopeFocus = scope ?? '';
        const chips = innerTree(focus, this.#view.nodes, this.#view.edges, depth);
        const signature = [
            focus,
            depth,
            layout,
            adapterNode.kind,
            adapterNode.status,
            chips.map((chip) => chip.id).join(','),
        ].join('|');
        if (signature !== this.#lensSignature) {
            overlay.dataset.kind = adapterNode.kind;
            const ports = derivePorts(focus, this.#view.edges, (id) => this.#positions.get(id));
            inspector.slot.innerHTML = focusCardMarkup(
                {
                    ...adapterNode,
                    ...(scope ? { scope } : {}),
                    ...(ports ? { data: { ...adapterNode.data, ports } } : {}),
                },
                chips,
                layout,
            );
            this.#lensSignature = signature;
        }
        this.refreshInstruments(modelNode);
        if (!inspector.pinned) {
            const canvas = el('canvas');
            const width = 340;
            const height = 230;
            const viewport = this.renderer.getViewport();
            const pixelsPerWorld =
                (canvas.clientWidth || 1000) / Math.max(viewport.extent?.width ?? 1000, 1);
            const scale =
                focus === this.#revealed ? Number(this.#resolved.values['emphasis.focusScale']) : 1;
            const cardHeight = nodeSize(adapterNode.kind, true)[1] * scale * pixelsPerWorld;
            const x = Math.min(
                Math.max(12, point.x - width / 2),
                Math.max(12, canvas.clientWidth - width - 12),
            );
            const y = Math.min(
                Math.max(12, point.y + cardHeight / 2 + 12),
                Math.max(12, canvas.clientHeight - height - 12),
            );
            overlay.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        }
        overlay.hidden = false;
        const line = this.#focusConnector;
        const parent = line?.parentElement;
        if (line && parent) {
            const canvasRect = el('canvas').getBoundingClientRect();
            const lensRect = overlay.getBoundingClientRect();
            line.setAttribute('x1', String(Math.round(point.x)));
            line.setAttribute('y1', String(Math.round(point.y)));
            line.setAttribute('x2', String(Math.round(lensRect.left - canvasRect.left + 12)));
            line.setAttribute('y2', String(Math.round(lensRect.top - canvasRect.top + 12)));
            parent.toggleAttribute('hidden', false);
        }
    }

    /** The rail shows at most two contextual instruments; the inspector holds the full kit. */
    private refreshInstruments(node?: RenderNode): void {
        if (!this.#instruments) return;
        const scoped = node ? [{ ...node, widgets: contextualInstruments(node) }] : [];
        this.#instruments.refresh(scoped);
        const key = node ? `${node.id}:${node.status ?? ''}` : '';
        if (key === this.#instrumentFocus) return;
        this.#instrumentFocus = key;
        this.#inspectorInstruments?.refresh(node ? [node] : []);
    }

    private bindTranscript(): void {
        const toggle = el<HTMLButtonElement>('transcript-toggle');
        const handle = el('transcript-resize');
        toggle.addEventListener('click', () => this.toggleTranscript());
        handle.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            handle.setPointerCapture(event.pointerId);
            const transcript = el('transcript');
            const surface = el('surface');
            const startX = event.clientX;
            const startY = event.clientY;
            const startWidth = transcript.getBoundingClientRect().width;
            const startHeight = transcript.getBoundingClientRect().height;
            const move = (next: PointerEvent) => {
                const stacked = this.#arrangement === 'stacked';
                const size = stacked
                    ? Math.min(
                          Math.max(startHeight - (next.clientY - startY), 120),
                          Math.max(surface.clientHeight - 120, 120),
                      )
                    : Math.min(
                          Math.max(startWidth - (next.clientX - startX), 200),
                          Math.max(surface.clientWidth - 240, 200),
                      );
                if (stacked) this.#transcriptHeight = size;
                else this.#transcriptWidth = size;
                surface.style.setProperty('--transcript-size', `${size}px`);
                if (this.#arrangement === 'floating') transcript.style.width = `${size}px`;
            };
            const up = () => {
                handle.removeEventListener('pointermove', move);
                handle.removeEventListener('pointerup', up);
                this.recordEvent('transcript:resize', {
                    arrangement: this.#arrangement,
                    size:
                        this.#arrangement === 'stacked'
                            ? this.#transcriptHeight
                            : this.#transcriptWidth,
                });
            };
            handle.addEventListener('pointermove', move);
            handle.addEventListener('pointerup', up);
        });

        const pane = el('transcript');
        const overview = el('transcript-overview');
        pane.addEventListener('scroll', () => this.updateTranscriptOverview());
        overview.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            overview.setPointerCapture(event.pointerId);
            const box = overview.getBoundingClientRect();
            const apply = (clientY: number) => {
                const ratio = Math.min(
                    Math.max((clientY - box.top) / Math.max(box.height, 1), 0),
                    1,
                );
                pane.scrollTop = ratio * Math.max(pane.scrollHeight - pane.clientHeight, 0);
            };
            const move = (next: PointerEvent) => apply(next.clientY);
            const up = () => {
                overview.removeEventListener('pointermove', move);
                overview.removeEventListener('pointerup', up);
                this.recordEvent('transcript:scroll', { ratio: pane.scrollTop });
            };
            apply(event.clientY);
            overview.addEventListener('pointermove', move);
            overview.addEventListener('pointerup', up);
        });
    }

    toggleCatalog(open?: boolean): boolean {
        const next = open ?? document.body.dataset.catalog !== 'open';
        document.body.dataset.catalog = next ? 'open' : 'closed';
        const panel = document.getElementById('catalog-panel');
        if (panel instanceof HTMLDetailsElement) panel.open = next;
        this.renderer.resize();
        this.recordEvent('catalog:toggle', { open: next });
        return next;
    }

    toggleRail(open?: boolean): boolean {
        const next = open ?? document.body.dataset.rail !== 'closed';
        document.body.dataset.rail = next ? 'open' : 'closed';
        this.renderer.resize();
        this.recordEvent('rail:toggle', { open: next });
        return next;
    }

    toggleTranscript(): void {
        this.#transcriptCollapsed = !this.#transcriptCollapsed;
        const surface = el('surface');
        surface.dataset.transcriptCollapsed = String(this.#transcriptCollapsed);
        const toggle = el<HTMLButtonElement>('transcript-toggle');
        toggle.textContent = this.#transcriptCollapsed ? '+' : '−';
        toggle.setAttribute('aria-expanded', String(!this.#transcriptCollapsed));
        toggle.setAttribute(
            'aria-label',
            this.#transcriptCollapsed ? 'Expand transcript' : 'Collapse transcript',
        );
        this.recordEvent('transcript:toggle', { collapsed: this.#transcriptCollapsed });
    }

    private renderGallery(): void {
        const minimal = this.#resolved.values['orchestration.verbs'] === 'minimal';
        const visible = minimal ? CAPABILITIES.slice(0, 3) : CAPABILITIES;
        el('gallery').replaceChildren(
            ...visible.map((capability) =>
                button(capability.title, () => this.run(capability.id), {
                    title: capability.summary,
                    dataset: { capability: capability.id },
                }),
            ),
        );
    }

    private showEvidence(lines: readonly string[]): void {
        this.#evidence = lines;
        el('evidence').replaceChildren(
            ...lines.map((line) => {
                const item = document.createElement('li');
                item.textContent = line;
                return item;
            }),
        );
    }

    private renderStatus(): void {
        el('status').textContent =
            `${this.#view.nodes.length} nodes · ${this.#view.edges.length} edges · ${this.#specs.length} scopes`;
    }

    /** Show a domain-neutral source frame; null returns to the view-derived state. */
    setFrame(state: FrameState | null, detail = ''): void {
        this.#manualFrame = state ? { state, detail } : undefined;
        this.applyFrame();
    }

    private applyFrame(): void {
        const manual = this.#manualFrame;
        const state = manual?.state ?? (this.#view.nodes.length ? null : 'empty');
        this.#stateFrame?.set(state, manual?.detail);
    }

    private renderAttention(): void {
        const { failures, changed, latest } = this.#attention;
        el('attention').textContent = failures
            ? `${failures} failure(s) · ${changed} file(s) · ${latest}`
            : `${changed} file(s) changed`;
    }

    private renderFollow(): void {
        el('follow-state').textContent = this.#lastFollowFrame?.nodeId ?? this.#followMode;
    }

    private renderAnnotationTarget(): void {
        el('annotation-target').textContent = this.#revealed
            ? `selected: ${this.#revealed}`
            : 'selected: none — reveal a node first';
    }

    private renderHistory(): void {
        const banner = el('history-banner');
        banner.hidden = this.#hidden === 0;
        banner.textContent = `${this.#hidden} earlier node(s) hidden — layout still measures the whole kernel`;
    }

    private renderHud(): void {
        el('hud').textContent =
            `${this.#level}/${this.#levelMode} · ${this.#depth}/${this.#depthAxis} · ` +
            `${this.simulation.settled ? 'settled' : 'moving'} · ` +
            `energy ${this.simulation.energy.toFixed(3)} · overlap ${this.#vision.overlap.toFixed(2)} · ` +
            `${Math.round(this.#fps)} fps`;
        el('play-energy').textContent =
            `energy ${this.playSession.energy.toFixed(3)} · ${this.playSession.preset ?? 'at rest'}`;
    }

    private syncDepthSelect(): void {
        el<HTMLSelectElement>('depth-mode').value = this.#depth;
    }

    private renderTranscript(): void {
        const messages = this.#view.nodes.filter((node) =>
            ['message', 'tool', 'read-tool', 'artifact', 'file', 'approval', 'error'].includes(
                node.kind,
            ),
        );
        const rows = messages.map((node) => {
            const expanded = this.#expandedMessages.has(node.id);
            const row = document.createElement('div');
            row.className = 'spine-row';
            row.dataset.expanded = String(expanded);
            row.dataset.kind = node.kind;
            const fullLabel = String(node.data?.fullLabel ?? node.label);
            const text = String(node.data?.text ?? node.summary ?? '');
            const head = document.createElement('div');
            head.className = 'spine-head';
            head.append(
                button(
                    `${fullLabel}: ${text}`,
                    () => this.reveal(node.id),
                    {
                        className: 'transcript-row',
                        dataset: { node: node.id, revealed: String(node.id === this.#revealed) },
                    },
                ),
                button(expanded ? '▾' : '▸', () => this.toggleMessage(node.id), {
                    className: 'spine-expand',
                    title: expanded ? 'Collapse detail' : 'Expand detail',
                }),
            );
            const detail = document.createElement('div');
            detail.className = 'transcript-detail';
            detail.textContent = `${node.kind} · ${node.status} · ${text || fullLabel}`;
            row.append(head, detail);
            return row;
        });
        el('transcript-list').replaceChildren(...rows);
        this.renderTranscriptOverview(messages.map((node) => node.id));
    }

    private toggleMessage(id: string): void {
        if (this.#expandedMessages.has(id)) this.#expandedMessages.delete(id);
        else this.#expandedMessages.add(id);
        this.recordEvent('transcript:expand', {
            node: id,
            expanded: this.#expandedMessages.has(id),
        });
        this.renderTranscript();
    }

    private renderTranscriptOverview(ids: readonly string[]): void {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 16 200');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('aria-hidden', 'true');
        const view = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        view.setAttribute('x', '2');
        view.setAttribute('width', '12');
        view.setAttribute('data-transcript-view', '');
        svg.append(view);
        for (const [index, id] of ids.entries()) {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', '8');
            dot.setAttribute('cy', String(((index + 0.5) / Math.max(ids.length, 1)) * 200));
            dot.setAttribute('r', '2.4');
            dot.setAttribute('data-transcript-node', id);
            svg.append(dot);
        }
        el('transcript-overview').replaceChildren(svg);
        this.updateTranscriptOverview();
    }

    private updateTranscriptOverview(): void {
        const pane = el('transcript');
        const view =
            el('transcript-overview').querySelector<SVGRectElement>('[data-transcript-view]');
        if (!view) return;
        const fraction = pane.clientHeight / Math.max(pane.scrollHeight, 1);
        const height = Math.max(12, 200 * fraction);
        const max = Math.max(pane.scrollHeight - pane.clientHeight, 1);
        view.setAttribute('height', String(height));
        view.setAttribute('y', String((pane.scrollTop / max) * (200 - height)));
    }

    private renderOverview(): void {
        el('overview').replaceChildren(
            ...this.#specs.map((spec) =>
                button(`${spec.id} · ${spec.nodes.length}`, () => {
                    const first =
                        spec.nodes[0] &&
                        this.#view.nodes.find((node) => node.id === spec.nodes[0].id);
                    if (first) this.reveal(first.id);
                }),
            ),
        );
    }

    private renderTurnMap(): void {
        el('turn-map').replaceChildren(
            ...(this.#view.turns ?? []).map((id, index) =>
                button(`turn ${index + 1}`, () => this.reveal(id), { title: id }),
            ),
        );
    }

    private renderTrail(): void {
        const current = this.#trail.current?.id;
        el<HTMLButtonElement>('trail-back').disabled = !this.#trail.canGoBack;
        el<HTMLButtonElement>('trail-forward').disabled = !this.#trail.canGoForward;
        el('trail-list').replaceChildren(
            ...this.#trail.entries.map((entry, index) =>
                button(`${index + 1}. ${entry.label ?? entry.id}`, () => this.trailTo(entry.id), {
                    dataset: { trailNode: entry.id, active: String(entry.id === current) },
                }),
            ),
        );
    }

    private portalCrumb(): readonly string[] {
        const scope = this.#revealed ? this.#portalByNode.get(this.#revealed) : undefined;
        return scope ? portalChain(scope, this.#specs) : [];
    }

    private renderPortalCrumb(): void {
        const chain = this.portalCrumb();
        const portalByScope = new Map(
            [...this.#portalByNode].map(([node, scope]) => [scope, node]),
        );
        if (!chain.length) {
            const hint = document.createElement('span');
            hint.textContent = 'reveal a portal node to see its scope path';
            el('portal-crumb').replaceChildren(hint);
            return;
        }
        const ruler = el('portal-crumb');
        ruler.dataset.ruler = 'true';
        ruler.replaceChildren(
            ...chain.map((scope, index) =>
                button(
                    scope,
                    () => {
                        const target =
                            portalByScope.get(scope) ??
                            this.#specs.find((spec) => spec.id === scope)?.nodes[0]?.id;
                        if (target) this.reveal(target);
                    },
                    {
                        title: index === chain.length - 1 ? 'current portal' : `back to ${scope}`,
                        dataset: { scope, rung: String(index + 1) },
                    },
                ),
            ),
        );
    }

    /** One visible proof line; the full catalogue stays one click away. */
    private renderProofLine(): void {
        const line = document.getElementById('proof-line');
        if (!(line instanceof HTMLButtonElement)) return;
        const { presets, experiments } = this.#catalog;
        line.textContent = `proof · ${presets.length} presets · ${experiments.length} experiments`;
        line.title = 'Open the catalogue of presets, experiments and recorded comparisons';
    }

    private mountFirstRunHint(): void {
        const hint = document.getElementById('first-run-hint');
        if (!(hint instanceof HTMLElement)) return;
        if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('shot')) {
            hint.remove();
            return;
        }
        const key = 'spacegraph:first-run-hint';
        if (localStorage.getItem(key) === 'seen') {
            hint.remove();
            return;
        }
        hint.hidden = false;
        const dismiss = (): void => {
            localStorage.setItem(key, 'seen');
            hint.remove();
            this.recordEvent('hint:dismiss', {});
        };
        hint.querySelector('button')?.addEventListener('click', dismiss);
    }

    private renderMinimap(): void {
        const width = 176;
        const height = 112;
        const positions = new Map(
            (this.#model?.nodes ?? []).map(
                (node) => [node.id, { x: node.position[0], y: node.position[1] }] as const,
            ),
        );
        const viewport = this.renderer.getViewport();
        const projection = Navigation.project({
            positions,
            box: { width, height },
            padding: 8,
            ...(viewport.extent
                ? {
                      viewport: {
                          center: [viewport.center[0], viewport.center[1]] as [number, number],
                          extent: viewport.extent,
                      },
                  }
                : {}),
        });
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'Graph overview minimap');
        if (projection.viewRect) {
            const view = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            view.dataset.minimapView = 'true';
            view.setAttribute('x', projection.viewRect.x.toFixed(1));
            view.setAttribute('y', projection.viewRect.y.toFixed(1));
            view.setAttribute('width', Math.max(1, projection.viewRect.width).toFixed(1));
            view.setAttribute('height', Math.max(1, projection.viewRect.height).toFixed(1));
            view.setAttribute('fill', 'none');
            view.setAttribute('stroke', 'var(--sg-colors-accent)');
            svg.append(view);
        }
        for (const [id, point] of positions) {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const projected = projection.project(point);
            dot.dataset.minimapNode = id;
            dot.setAttribute('cx', projected.x.toFixed(1));
            dot.setAttribute('cy', projected.y.toFixed(1));
            dot.setAttribute('r', id === this.#revealed ? '3' : '1.6');
            dot.setAttribute(
                'fill',
                id === this.#revealed ? 'var(--sg-colors-ring)' : 'var(--sg-colors-edge)',
            );
            svg.append(dot);
        }
        el('minimap').replaceChildren(svg);
    }
}
