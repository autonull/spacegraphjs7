import {
    DEFAULT_THEME,
    DEPTH_MODES,
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
import { ScopeSimulation, type ScopeSpec } from 'spacegraphjs/layout';
import { MotionDirector, type MotionPlayback } from 'spacegraphjs/motion';
import { AgentAdapter, toAdapterModel, type AgentLevel } from './adapter';
import {
    CAPABILITIES,
    capabilityContext,
    runCapability,
    type PiHostState,
} from './capabilities';
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
    windowedView,
    type Position,
    type VisionScores,
} from './policy';
import { agentScopes } from './scopes';
import { readTheme } from './theme';

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

/**
 * Host-owned policy. The library never learns about Pi, prompts, lanes, levels or depth choices;
 * this class translates a stream of kernel ops into a settled, recursive 3D graph and drives the
 * simulation, activity, vision sampling and camera from one frame clock.
 */
export class PiHost {
    readonly renderer = new SpaceGraphRenderer();
    readonly simulation: ScopeSimulation;
    readonly director = new MotionDirector();

    #kernel = new Kernel();
    #theme: RenderTheme = DEFAULT_THEME;
    #controller = new GraphController({ trailMaxDepth: 8 });
    #adapter = new AgentAdapter();
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
    #visionTime = 0;
    #windowSize = 60;
    #hidden = 0;
    #laneScope = '';

    constructor(
        options: { projection?: Projection; reducedMotion?: boolean; global?: boolean } = {},
    ) {
        this.#projection = options.projection ?? '3d';
        this.#global = options.global ?? true;
        this.#reducedMotion =
            options.reducedMotion ??
            (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
        this.simulation = new ScopeSimulation({
            instant: this.#reducedMotion,
            layout: { seed: 7, gap: 190, depthStep: 220, nodePadding: 36 },
            forces: { repulsion: 1800, attraction: 0.018, cooling: 0.94, maxBodies: 120 },
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
        if (this.#global) {
            const instances = (window as unknown as { SpaceGraph?: { instances?: Set<unknown> } }).SpaceGraph?.instances;
            const vision = instances ? (Array.from(instances)[0] as { vision?: { modelsLoaded?: boolean } }) : undefined;
            if (vision?.vision) vision.vision.modelsLoaded = true;
        }
        if (!supportsDepth(this.renderer.capabilities, this.#depth)) this.#depth = 'flat';
        this.renderer.setDepth(this.#depth);
        this.#controller.bind(this.renderer);
        this.registerMotion();
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
        });
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
                return {
                    ...node,
                    position: position ? ([position.x, position.y, position.z] as [number, number, number]) : node.position,
                    emphasis: activity > 0 ? Math.min(1, (node.emphasis ?? 0.3) + activity) : node.emphasis,
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
            this.sampleVision();
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
        if (this.#pinnedReveal && this.#pinnedReveal !== qualified) this.simulation.unpin([this.#pinnedReveal]);
        if (qualified) this.simulation.pin([qualified]);
        this.#pinnedReveal = qualified;
        if (typeof location !== 'undefined') location.hash = `graph:${id}`;
        const row = document.querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`);
        for (const selected of document.querySelectorAll('[data-revealed="true"]')) {
            selected.setAttribute('data-revealed', 'false');
        }
        if (row) {
            row.setAttribute('data-revealed', 'true');
            row.scrollIntoView({ block: 'nearest', behavior: this.#reducedMotion ? 'instant' : 'smooth' });
        }
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
            positionOf: (id: string) => this.#positions.get(id),
            advance: (seconds: number) => this.advance(seconds),
            settle: () => this.settle(),
            clock: () => this.#clock,
            ticks: () => this.#ticks,
            fps: () => this.#fps,
            vision: () => this.#vision,
            activity: () => [...this.#activity.keys()],
            pan: (dx: number, dy: number) => this.pan(dx, dy),
            zoomBy: (factor: number) => this.zoomBy(factor),
            export: (format: 'json' | 'svg' | 'html') => this.exportModel(format),
            unsupported: () => UNSUPPORTED,
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
            const offset = supports ? sampleDepth(continuum, this.axisValue(id), distance).offset : 0;
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
        const depth: Readonly<Record<string, number>> = {
            run: 0,
            unit: 1,
            state: 2,
            message: 2,
            action: 3,
            artifact: 4,
            retry: 4,
        };
        return (depth[node.kind] ?? 2) / 4;
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
        this.director.register('trace', () => undefined);
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
                { id: `trace:${id}`, verb: 'trace', target: 'emphasis', from: 0, to: 1, duration: 0.2 },
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
        if (this.#clock && !moving && !flying && !active) this.#clock = false;
        if (!this.#clock && (moving || flying || active) && !document.hidden) {
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
        const canvas = el('canvas');
        canvas.tabIndex = 0;
        canvas.addEventListener('keydown', (event) => this.onKey(event));
        this.applySurface();
        const hash = location.hash.match(/^#graph:(.+)$/);
        if (hash) this.reveal(decodeURIComponent(hash[1]));
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
            type: format === 'json' ? 'application/json' : format === 'svg' ? 'image/svg+xml' : 'text/html',
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
        el('status').textContent = `${this.#view.nodes.length} nodes · ${this.#view.edges.length} edges · ${this.#specs.length} scopes`;
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
                    const first = spec.nodes[0] && this.#view.nodes.find((node) => node.id === spec.nodes[0].id);
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

export const DEPTH_CHOICES = DEPTH_MODES;
