import {
    DEFAULT_THEME,
    supportsDepth,
    type DepthMode,
    type Projection,
    type RenderModel,
    type RenderTheme,
} from '@spacegraphjs/renderer';
import { SpaceGraphRenderer } from '@spacegraphjs/spacegraph-renderer';
import { agentDomain, changedFiles, failureDetails } from '@spacegraphjs/agent';
import { Kernel, type KernelOp } from '@spacegraphjs/kernel';
import type { GraphNode } from '@spacegraphjs/shared';
import {
    computeFollowFrame,
    DEFAULT_LIVE_FOLLOW_MODE,
    type CameraMove,
    type FollowMode,
} from '@spacegraphjs/navigation/follow';
import { GraphController } from 'spacegraphjs/control';
import { sampleDepth, type DepthAxis } from 'spacegraphjs/depth';
import { ScopeSimulation, type ScopePolicyInput, type ScopeSpec } from 'spacegraphjs/layout';
import { MotionDirector, type MotionPlayback } from 'spacegraphjs/motion';
import {
    createVisionLoop,
    type VisionLoop,
    type VisionLoopAnalyzers,
    type VisionLoopReport,
    type VisionLoopScores,
    type VisionReport,
} from 'spacegraphjs/vision';
import {
    AgentAdapter,
    cardMarkup,
    representationRung,
    toAdapterModel,
    type AgentLevel,
} from './adapter';
import {
    createAnnotationWidgets,
    NoteStore,
    withPinnedNotes,
    type AnnotationWidgets,
    type PinnedNote,
} from './annotations';
import { CAPABILITIES, capabilityContext, runCapability, type PiHostState } from './capabilities';
import { fixtureKernel } from './fixture';
import { foldKernelOps } from './ops';
import {
    CARD_BUDGETS,
    UNSUPPORTED,
    decayActivity,
    exportHTML,
    exportJSON,
    exportSVG,
    levelForZoom,
    scoreVision,
    unsupportedSeams,
    windowedView,
    type Position,
    type VisionScores,
} from './policy';
import { agentScopes, DEPTH } from './scopes';
import { readTheme } from './theme';
import { decodePermalink, encodePermalink, isRevealHash, type PermalinkState } from './permalink';
import { createPlaySession, type GravityPreset, type PlaySession } from './play';
import { buildReportHTML } from './report';
import { STUDY_TASKS } from './study';
import { traceOrder } from './trace';

export type Arrangement = 'stacked' | 'side' | 'floating';
export type Surface = 'log' | 'map' | 'hybrid';
export type LevelMode = AgentLevel | 'auto';

const FOLLOW_MODES: readonly FollowMode[] = ['off', 'turn', 'node', 'node+focus'];
const LEVELS: readonly AgentLevel[] = ['overview', 'execution', 'detail'];
const LEVEL_MODES: readonly LevelMode[] = ['auto', ...LEVELS];
const ARRANGEMENTS: readonly Arrangement[] = ['stacked', 'side', 'floating'];
const SURFACES: readonly Surface[] = ['log', 'map', 'hybrid'];

export const el = <T extends HTMLElement>(id: string): T => {
    const found = document.getElementById(id);
    if (!found) throw new Error(`pi app: missing #${id}`);
    return found as T;
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

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
    readonly playSession: PlaySession;

    #kernel = new Kernel();
    #theme: RenderTheme = DEFAULT_THEME;
    #controller = new GraphController({ trailMaxDepth: 8 });
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
    #visionLoop?: VisionLoop;
    #visionLoopEnabled = false;
    #visionLoopBusy = false;
    #visionReport?: VisionLoopReport;
    #windowSize = 60;
    #hidden = 0;
    #laneScope = '';
    #paused = false;

    constructor(
        options: { projection?: Projection; reducedMotion?: boolean; global?: boolean } = {},
    ) {
        this.#projection = options.projection ?? '3d';
        this.#global = options.global ?? true;
        this.#reducedMotion =
            options.reducedMotion ??
            (typeof matchMedia === 'function' &&
                matchMedia('(prefers-reduced-motion: reduce)').matches);
        this.simulation = new ScopeSimulation({
            instant: this.#reducedMotion,
            layout: { seed: 7, gap: 190, depthStep: 220, nodePadding: 36 },
            forces: { repulsion: 1800, attraction: 0.018, cooling: 0.94, maxBodies: 120 },
        });
        const simulation = this.simulation;
        this.playSession = createPlaySession({
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
    }

    async mount(container: HTMLElement): Promise<void> {
        this.#theme = readTheme();
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
        this.registerMotion();
        this.#annotationWidgets = createAnnotationWidgets(el('annotation-list'), (id) =>
            this.removeNote(id),
        );
        this.renderer.on('nodeClick', ({ id }) => this.reveal(id));
        this.renderer.on('viewportChange', ({ zoom }) => this.applyAutoLevel(zoom));

        this.refresh();
        this.simulation.settle();
        this.renderPositions();
        this.renderGallery();
        this.renderTranscript();
        this.renderOverview();
        this.renderTurnMap();
        this.renderHud();
        this.bindControls();
        this.renderVisionLoop();
        if (
            this.#global &&
            typeof location !== 'undefined' &&
            new URLSearchParams(location.search).get('visionLoop') === 'on'
        ) {
            this.setVisionLoop(true);
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
    }

    paint(): void {
        this.#positions = this.simulatedPositions();
        const windowed = windowedView(this.#view, this.#windowSize);
        this.#hidden = windowed.hidden;
        const model = toAdapterModel(windowed.view);
        model.nodes = model.nodes.map((node) => {
            const scope = this.#portalByNode.get(node.id);
            return scope ? { ...node, scope } : node;
        });
        this.#model = this.#adapter.build(model, {
            level: this.#level,
            positions: this.#positions,
            edges: true,
            focus: this.#controller.selection[0],
            renderCard: (node, level, context) =>
                cardMarkup(
                    node,
                    representationRung({
                        level,
                        activity: this.#activity.get(node.id) ?? 0,
                        legibility: this.#vision.legibility,
                    }),
                    context,
                ),
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
        this.#annotationWidgets?.refresh(this.#model.nodes);
        this.renderer.setModel(this.#model);
        this.renderHistory();
    }

    renderPositions(): void {
        this.#positions = this.simulatedPositions();
        if (!this.#model) return this.paint();
        this.#model = {
            ...this.#model,
            nodes: this.#model.nodes.map((node) => {
                const position = this.#positions.get(node.id);
                const activity = this.#activity.get(node.id) ?? 0;
                const base =
                    activity > 0 ? Math.min(1, (node.emphasis ?? 0.3) + activity) : node.emphasis;
                const index = this.#traceIds.indexOf(node.id);
                const traced = index >= 0 && index <= this.#traceProgress + 1;
                return {
                    ...node,
                    position: position
                        ? ([position.x, position.y, position.z] as [number, number, number])
                        : node.position,
                    emphasis: traced ? 1 : base,
                };
            }),
        };
        this.renderer.setModel(this.#model);
    }

    advance(seconds: number): void {
        if (document.hidden) return;
        this.#ticks++;
        this.simulation.advance(seconds);
        this.#playback?.advance(seconds);
        if (this.#playback?.done) this.#playback = undefined;
        decayActivity(this.#activity, seconds);
        this.#visionTime += seconds;
        if (this.#visionTime >= 0.4) {
            this.#visionTime = 0;
            if (this.#visionLoopEnabled) this.runVisionLoop();
            else this.sampleVision();
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
        this.#activity.clear();
        this.renderPositions();
    }

    reveal(id: string): void {
        if (!this.#view.nodes.some((node) => node.id === id)) return;
        this.#revealed = id;
        this.renderer.setSelection([id]);
        const qualified = this.#qualifiedByNode.get(id);
        if (this.#pinnedReveal && this.#pinnedReveal !== qualified)
            this.simulation.unpin([this.#pinnedReveal]);
        if (qualified) this.simulation.pin([qualified]);
        this.#pinnedReveal = qualified;
        if (typeof location !== 'undefined') location.hash = `graph:${id}`;
        const row = document.querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`);
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
        this.#depth = mode;
        this.renderer.setDepth(mode);
        this.paint();
        this.renderHud();
        this.syncDepthSelect();
        return mode;
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
        this.#windowSize = Math.max(1, Math.floor(size));
        this.paint();
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
        this.#arrangement = arrangement;
        this.applySurface();
        return arrangement;
    }

    setSurface(surface: Surface): Surface {
        if (!SURFACES.includes(surface)) return this.#surface;
        this.#surface = surface;
        this.applySurface();
        return surface;
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
    }

    zoomBy(factor: number): number {
        const viewport = this.renderer.getViewport();
        const zoom = Math.max(0.1, Math.min(6, viewport.zoom * factor));
        this.renderer.setViewport({ ...viewport, zoom });
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
        const url = URL.createObjectURL(new Blob([this.report()], { type: 'text/html' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `pi-report-${Date.now()}.html`;
        link.click();
        URL.revokeObjectURL(url);
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
        };
        return encodePermalink(state);
    }

    applyPermalink(hash: string): boolean {
        const state = decodePermalink(hash);
        if (!state) return false;
        if (SURFACES.includes(state.surface as Surface)) this.setSurface(state.surface as Surface);
        if (ARRANGEMENTS.includes(state.arrangement as Arrangement))
            this.setArrangement(state.arrangement as Arrangement);
        if (supportsDepth(this.renderer.capabilities, state.depth as DepthMode))
            this.setDepth(state.depth as DepthMode);
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
        this.showEvidence(lines);
        return lines;
    }

    hooks(): Record<string, unknown> {
        return {
            capabilities: () => CAPABILITIES.map((capability) => capability.id),
            run: (id: string) => this.run(id),
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
            budgets: () => CARD_BUDGETS,
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
            play: (preset?: GravityPreset) => this.play(preset),
            reconcilePlay: () => this.reconcilePlay(),
            playSession: () => ({
                active: this.playSession.active,
                preset: this.playSession.preset,
                energy: this.playSession.energy,
            }),
            activity: () => [...this.#activity.keys()],
            viewport: () => this.renderer.getViewport(),
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

    private registerMotion(): void {
        this.director.register('flyTo', ({ progress }) => {
            this.renderer.setViewport({
                zoom: this.#flightFrom.zoom,
                center: [
                    lerp(this.#flightFrom.center[0], this.#flightTo.x, progress),
                    lerp(this.#flightFrom.center[1], this.#flightTo.y, progress),
                    lerp(this.#flightFrom.center[2], this.#flightTo.z, progress),
                ],
            });
        });
        this.director.register('trace', ({ value }) => {
            this.#traceProgress = value;
            const index = Math.floor(value);
            const from = this.#tracePositions[index];
            if (!from) return;
            const to = this.#tracePositions[index + 1] ?? from;
            const t = value - index;
            this.renderer.setViewport({
                ...this.renderer.getViewport(),
                center: [lerp(from.x, to.x, t), lerp(from.y, to.y, t), lerp(from.z, to.z, t)],
            });
            this.renderPositions();
        });
    }

    trace(id: string): readonly string[] {
        this.#playback?.finish();
        this.#playback = undefined;
        this.#traceIds = traceOrder(this.#view, id);
        this.#tracePositions = this.#traceIds
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
        this.#flightFrom = this.renderer.getViewport();
        this.#flightTo = target;
        this.#playback = this.director.play(
            [
                {
                    id: `trace:${id}`,
                    verb: 'trace',
                    target: 'emphasis',
                    from: 0,
                    to: 1,
                    duration: 0.2,
                },
                {
                    id: `flyTo:${id}`,
                    verb: 'flyTo',
                    target: 'camera',
                    from: 0,
                    to: 1,
                    duration: 0.9,
                    delay: 0.1,
                },
            ],
            { ease: 'power2.inOut' },
        );
        this.renderFollow();
    }

    private applyAutoLevel(zoom: number): void {
        if (this.#levelMode !== 'auto') return;
        const next = levelForZoom(zoom, this.#level);
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
            Escape: () => {
                this.renderer.setSelection([]);
                this.#revealed = '';
            },
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
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pi-graph.${format}`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    private applySurface(): void {
        const main = el('surface');
        main.dataset.surface = this.#surface;
        main.dataset.arrangement = this.#arrangement;
        for (const surface of SURFACES) {
            el(`surface-${surface}`).setAttribute('data-active', String(surface === this.#surface));
        }
    }

    private renderGallery(): void {
        el('gallery').replaceChildren(
            ...CAPABILITIES.map((capability) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.capability = capability.id;
                button.textContent = capability.title;
                button.title = capability.summary;
                button.addEventListener('click', () => this.run(capability.id));
                return button;
            }),
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
        el('transcript-list').replaceChildren(
            ...this.#view.nodes
                .filter((node) => node.kind === 'message')
                .map((node) => {
                    const row = document.createElement('button');
                    row.type = 'button';
                    row.className = 'transcript-row';
                    row.dataset.node = node.id;
                    row.dataset.revealed = String(node.id === this.#revealed);
                    row.textContent = `${node.label}: ${String(node.data?.text ?? node.summary ?? '')}`;
                    row.addEventListener('click', () => this.reveal(node.id));
                    return row;
                }),
        );
    }

    private renderOverview(): void {
        el('overview').replaceChildren(
            ...this.#specs.map((spec) => {
                const row = document.createElement('button');
                row.type = 'button';
                row.textContent = `${spec.id} · ${spec.nodes.length}`;
                row.addEventListener('click', () => {
                    const first =
                        spec.nodes[0] &&
                        this.#view.nodes.find((node) => node.id === spec.nodes[0].id);
                    if (first) this.reveal(first.id);
                });
                return row;
            }),
        );
    }

    private renderTurnMap(): void {
        el('turn-map').replaceChildren(
            ...(this.#view.turns ?? []).map((id, index) => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.textContent = `turn ${index + 1}`;
                chip.title = id;
                chip.addEventListener('click', () => this.reveal(id));
                return chip;
            }),
        );
    }
}
