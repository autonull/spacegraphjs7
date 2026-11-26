/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- delegates are installed on the prototype and typed by the merged interface. */
import { CameraControls, ObjectPoolManager, PluginManager, VisionManager } from './core';
import { listLayouts } from './core/layout-registry';
import { InputManager } from './input';
import { FingeringPriority } from './core/constants';
import { ErgonomicsAPI } from './core/Ergonomics';
import { EventEmitter } from './core/EventEmitter';
import { Graph } from './core/Graph';
import { WebGLRenderer } from './core/WebGLRenderer';
import { Selection } from './core/Selection';
import { Edge } from './edges/Edge';
import { zoomCameraOnWheel } from './input/CameraWheel';
import { createCameraFingering, PinchZoomFingering } from './input/fingerings';
import type { WheelEventData } from './input/InputManager';
import { Node } from './nodes/Node';
import type {
    CameraViewport,
    DepthMode,
    EdgeSpec,
    FitInsets,
    GraphImportData,
    GraphSpec,
    LayoutOptionsMap,
    LayoutOptionsFor,
    NodeSpec,
    Projection,
    SpaceGraphEvents,
    SpaceGraphOptions,
    SpecUpdate,
} from './types';
import type { CardFacing } from '@spacegraphjs/renderer';

// Internal controllers
import { CameraController } from './spacegraph/CameraController';
import { AnimationController } from './spacegraph/AnimationController';
import { DepthController } from './spacegraph/DepthController';
import { LifecycleController } from './spacegraph/LifecycleController';
import { StaticMethods } from './spacegraph/StaticMethods';

export const VERSION = '8.5.0';

export interface FrameOptions {
    readonly padding?: number;
    readonly duration?: number;
    readonly minScale?: number;
    readonly insets?: FitInsets;
}

type GraphExportSpec = GraphSpec & { plugins?: Record<string, unknown> };

export class SpaceGraph {
    public static instances = new Set<SpaceGraph>();

    public readonly container: HTMLElement;
    public readonly options: SpaceGraphOptions;

    // Core components
    public renderer!: WebGLRenderer;
    public graph!: Graph;
    public pluginManager!: PluginManager;
    public cameraControls!: CameraControls;
    public events!: EventEmitter<SpaceGraphEvents>;
    public vision!: VisionManager;
    public poolManager!: ObjectPoolManager<unknown>;
    public input!: InputManager;
    public ergo!: ErgonomicsAPI;
    public selection!: Selection;
    /** Present only when `options.scopes.enabled` is true. */
    public scopes?: import('./plugins/ScopesPlugin').ScopesPlugin;

    // Controllers
    public readonly cameraController: CameraController;
    public readonly animationController: AnimationController;
    public readonly depthController: DepthController;
    public readonly lifecycleController: LifecycleController;

    /** Whether animations should be instant. Respects `reducedMotion` option, falls back to system preference. */
    get reducedMotion(): boolean {
        if (this.options.reducedMotion !== undefined) return this.options.reducedMotion;
        return (
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        );
    }

    constructor(container: HTMLElement, options: SpaceGraphOptions = {}) {
        this.options = options;
        this.container = container;

        this.cameraController = new CameraController(this);
        this.animationController = new AnimationController(this);
        this.depthController = new DepthController(this);
        this.lifecycleController = new LifecycleController(this);

        this.#init();
        if (options.global) {
            SpaceGraph.instances.add(this);
            if (typeof window !== 'undefined') window.SpaceGraph = SpaceGraph;
        }
    }

    get nodeCount(): number {
        return this.graph.nodes.size;
    }
    get edgeCount(): number {
        return this.graph.edges.size;
    }
    get selected(): string[] {
        return this.selection.list;
    }
    get selectedNodes(): Node[] {
        return this.selected
            .map((id) => this.graph.queryEngine.getNode(id))
            .filter((n): n is Node => n !== undefined);
    }
    get selectedEdges(): Edge[] {
        return this.selected
            .map((id) => this.graph.queryEngine.getEdge(id))
            .filter((e): e is Edge => e !== undefined);
    }
    get isEmpty(): boolean {
        return this.graph.nodes.size === 0;
    }
    get stats() {
        return {
            nodes: this.nodeCount,
            edges: this.edgeCount,
            plugins: this.pluginManager.plugins.size,
        };
    }
    static getContainerElement = StaticMethods.getContainerElement;
    static create = StaticMethods.create;
    static load = StaticMethods.load;
    static fromURL = StaticMethods.fromURL;
    static quickGraph = StaticMethods.quickGraph;
    static fromManifest = StaticMethods.fromManifest;
    async init(): Promise<void> {
        return this.lifecycleController.init();
    }
    loadSpec(spec: GraphSpec): this {
        spec.nodes?.forEach((node) => this.graph.addNode(node));
        spec.edges?.forEach((edge) => this.graph.addEdge(edge));
        return this;
    }

    update(spec: SpecUpdate): void {
        spec.nodes?.forEach((u) => u.id && this.graph.updateNode(u.id, u));
        spec.edges?.forEach((u) => u.id && this.graph.updateEdge(u.id, u));
    }

    export(): GraphExportSpec {
        const spec: GraphExportSpec = this.graph.ser.toJSON((item) => item.constructor.name);
        if (this.cameraControls?.target) {
            spec.camera = this.cameraToSpec();
        }
        const pluginState = this.pluginManager.export();
        if (pluginState && Object.keys(pluginState).length > 0) spec.plugins = pluginState;
        return spec;
    }

    import(data: GraphImportData): void {
        this.graph.clear();
        this.loadSpec(data as GraphSpec);
        if (data.camera && this.cameraControls?.target) {
            this.specToCamera(data.camera);
            this.cameraControls.update();
        }
        if (data.plugins) this.pluginManager.import(data.plugins as Record<string, unknown>);
    }
    getNode(id: string): Node | undefined {
        return this.graph.nodes.get(id);
    }
    getEdge(id: string): Edge | undefined {
        return this.graph.edges.get(id);
    }
    hasNode(id: string): boolean {
        return this.graph.nodes.has(id);
    }
    hasEdge(id: string): boolean {
        return this.graph.edges.has(id);
    }
    clear(): void {
        this.graph.clear();
    }
    fitView(
        padding = 100,
        duration = 1.5,
        ids?: readonly string[],
        options?: { minScale?: number; insets?: FitInsets },
    ): SpaceGraph {
        return this.cameraController.fitView(padding, duration, ids, options);
    }
    focusNode(id: string, _padding = 100, duration = 1): SpaceGraph {
        return this.cameraController.focusNode(id, _padding, duration);
    }
    /** Frame one id, a set of ids, or the whole graph with named options. */
    frame(
        target: readonly string[] | string | null = null,
        options: FrameOptions = {},
    ): SpaceGraph {
        const ids = target == null ? undefined : typeof target === 'string' ? [target] : target;
        return this.fitView(options.padding ?? 100, options.duration ?? 0.6, ids, {
            minScale: options.minScale,
            insets: options.insets,
        });
    }
    /** Bring one node under the camera without changing zoom. */
    inspect(id: string, options: { duration?: number } = {}): SpaceGraph {
        return this.focusNode(id, 0, options.duration ?? 0.35);
    }
    center(x: number, y: number, z = 0): SpaceGraph {
        return this.cameraController.center(x, y, z);
    }
    resetCamera(): SpaceGraph {
        return this.cameraController.resetCamera();
    }
    setCamera(position: [number, number, number], target?: [number, number, number]): SpaceGraph {
        return this.cameraController.setCamera(position, target);
    }
    setOrbitEnabled(enabled: boolean): SpaceGraph {
        return this.cameraController.setOrbitEnabled(enabled);
    }
    setPolar(phi: number, theta: number, duration = 0): SpaceGraph {
        return this.cameraController.setPolar(phi, theta, duration);
    }
    animate(timestamp = 0): void {
        this.animationController.animate(timestamp);
    }
    requestFrame(): void {
        this.animationController.requestFrame();
    }
    render(): SpaceGraph {
        return this.animationController.render();
    }
    pause(): void {
        this.animationController.pause();
    }
    resume(): SpaceGraph {
        return this.animationController.resume();
    }
    dispose(): void {
        this.lifecycleController.dispose();
    }
    destroy(): void {
        this.lifecycleController.destroy();
    }
    addNode(spec: NodeSpec | Node): Node | null {
        return this.graph.addNode(spec);
    }
    addEdge(spec: EdgeSpec | Edge): Edge | null {
        return this.graph.addEdge(spec);
    }
    removeNode(id: string): void {
        this.graph.removeNode(id);
    }
    removeEdge(id: string): void {
        this.graph.removeEdge(id);
    }
    select(target: string | readonly string[] | null): this {
        this.selection.select(target);
        return this;
    }
    clearSelection(): this {
        this.selection.clear();
        return this;
    }
    toggleSelection(id: string): this {
        this.selection.toggle(id);
        return this;
    }
    deselect(id: string): this {
        this.selection.deselect(id);
        return this;
    }
    show(id: string, visible = true): this {
        const node = this.graph.nodes.get(id);
        if (node) node.setVisible(visible);
        return this;
    }
    hide(id: string): this {
        return this.show(id, false);
    }
    watch<K extends keyof SpaceGraphEvents>(
        type: K,
        callback: (data: SpaceGraphEvents[K]) => void,
    ): () => void {
        const handler = (data: SpaceGraphEvents[K]) => callback(data);
        this.events.on(type, handler);
        return () => this.events.off(type, handler);
    }
    /** Apply a layout by name with typed options */
    async layout<Name extends keyof LayoutOptionsMap>(
        name: Name,
        options?: Partial<LayoutOptionsFor<Name>>,
    ): Promise<void> {
        const plugin = this.pluginManager.get(name);
        if (!plugin) {
            const registered = new Set(listLayouts());
            const available = Array.from(this.pluginManager.plugins.keys()).filter((n) =>
                registered.has(n),
            );
            throw new Error(
                `[SpaceGraph] Unknown layout "${name}". Available layouts: ${available.join(', ')}. Use listLayouts() for full registry.`,
            );
        }
        if ('applyLayout' in plugin)
            await (
                plugin as { applyLayout: (opts?: Record<string, unknown>) => Promise<void> }
            ).applyLayout(options);
    }

    /** Apply a layout once with typed options (alias for layout) */
    layoutOnce<Name extends keyof LayoutOptionsMap>(
        name: Name,
        options?: Partial<LayoutOptionsFor<Name>>,
    ): Promise<void> {
        return this.layout(name, options);
    }
    setPositions(positions: Record<string, [number, number, number]>): this {
        this.graph.setPositions(positions);
        return this;
    }
    getPositions(): Record<string, [number, number, number]> {
        return this.graph.getPositions();
    }
    pinAll(pinned = true): this {
        this.graph.pinAll(pinned);
        return this;
    }
    get projection(): Projection {
        return this.renderer.projection;
    }
    setProjection(projection: Projection): SpaceGraph {
        return this.depthController.setProjection(projection);
    }
    get depth(): DepthMode {
        return this.depthController.depth;
    }
    setDepth(depth: DepthMode): SpaceGraph {
        return this.depthController.setDepth(depth);
    }
    get cardFacing(): CardFacing {
        return this.depthController.cardFacing;
    }
    setCardFacing(facing: CardFacing): SpaceGraph {
        return this.depthController.setCardFacing(facing);
    }
    applySceneFade(): SpaceGraph {
        return this.depthController.applySceneFade();
    }
    get zoom(): number {
        return this.renderer.getZoom();
    }
    setZoom(value: number): this {
        return this.updateCameraState(() => {
            this.renderer.setZoom(value);
            this.cameraControls?.update();
        });
    }
    get viewport(): CameraViewport {
        return this.renderer.getViewport();
    }
    get camera() {
        return this.renderer.camera;
    }
    get cameraPosition(): [number, number, number] {
        const position = this.renderer.camera.position;
        return [position.x, position.y, position.z];
    }
    registerFingerings(): void {
        this.input.registerFingering(
            createCameraFingering(this.cameraControls),
            FingeringPriority.CAMERA,
        );
        this.input.registerFingering(new PinchZoomFingering(this), FingeringPriority.PINCH_ZOOM);
        this.events.on('input:camera:wheel', (e) => this.#onCameraWheel(e as WheelEventData));
    }

    #onCameraWheel(e: WheelEventData): void {
        const canvas = this.renderer.renderer.domElement;
        zoomCameraOnWheel(this.cameraControls, canvas, e);
        (
            e as { originalEvent?: { preventDefault?: () => void } }
        ).originalEvent?.preventDefault?.();
    }
    /** Common pattern: update cameraControls, report viewport, request frame. */
    commitCamera(): this {
        this.cameraControls?.update();
        this.cameraController.reportViewport(true);
        this.requestFrame();
        return this;
    }

    /**
     * Helper for camera state updates that need to sync renderer, cameraControls, and emit events.
     * Runs the update function, then commits the camera state.
     */
    protected updateCameraState(fn: () => void): this {
        fn();
        return this.commitCamera();
    }

    /** Export current camera state to spec format. */
    cameraToSpec(): { position: [number, number, number]; target: [number, number, number] } {
        const { camera } = this.renderer;
        const { target } = this.cameraControls;
        return {
            position: [camera.position.x, camera.position.y, camera.position.z],
            target: [target.x, target.y, target.z],
        };
    }

    /** Import camera state from spec format. */
    specToCamera(camera: {
        position: [number, number, number];
        target: [number, number, number];
    }): void {
        this.renderer.camera.position.set(...camera.position);
        this.cameraControls.target.set(...camera.target);
        this.cameraControls.updateSpherical();
    }
    #init(): void {
        this.animationController.setContinuousMode(
            (this.options.render?.renderMode ?? 'on-demand') === 'continuous',
        );
        this.lifecycleController.createCoreObjects();
        this.depthController.initialize(this.options.render?.depth ?? 'flat');
    }

    get disposed(): boolean {
        return this.lifecycleController.disposed;
    }
    reportViewport(force = false): void {
        this.cameraController.reportViewport(force);
    }

    // Test access
    inputManagerFactory(params: {
        sg: SpaceGraph;
        events: EventEmitter<SpaceGraphEvents>;
    }): InputManager {
        return new InputManager(params);
    }
}

/** Fluent names documented on `SpaceGraph`; their implementation lives in `ErgonomicsAPI`. */
const ERGONOMIC_DELEGATES = [
    '$',
    '$$',
    'at',
    'must',
    'findNodes',
    'findNode',
    'getNodesByType',
    'findEdges',
    'getEdgesForNode',
    'where',
    'has',
    'neighbors',
    'adjacent',
    'connections',
    'inEdges',
    'outEdges',
    'traverse',
    'bfs',
    'dfs',
    'path',
    'getSubgraph',
    'selectAll',
    'add',
    'addNodes',
    'addEdges',
    'connect',
    'connectTo',
    'connectFrom',
    'disconnect',
    'remove',
    'removeWhere',
    'updateWhere',
    'forNodes',
    'forEdges',
    'forEach',
    'each',
    'map',
    'filter',
    'some',
    'every',
    'reduce',
    'move',
    'translate',
    'shift',
    'label',
    'text',
    'color',
    'fill',
    'data',
    'attr',
    'rotate',
    'scale',
    'setSize',
    'opacity',
    'clone',
    'require',
    'pinned',
    'unpin',
    'draggable',
    'selectable',
    'visible',
    'toggle',
    'batch',
    'transaction',
    'freeze',
    'suspend',
] as const satisfies readonly (keyof ErgonomicsAPI)[];
export type ErgonomicDelegate = (typeof ERGONOMIC_DELEGATES)[number];
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- the merge supplies the delegate members
export interface SpaceGraph extends Pick<ErgonomicsAPI, ErgonomicDelegate> {}
for (const name of ERGONOMIC_DELEGATES) {
    Object.defineProperty(SpaceGraph.prototype, name, {
        value: function (this: SpaceGraph, ...args: unknown[]) {
            const ergo = this.ergo as unknown as
                Record<string, (...args: unknown[]) => unknown> | undefined;
            if (!ergo) throw new Error(`[SpaceGraph] ${name} requires init()`);
            return ergo[name](...args);
        },
        configurable: true,
        writable: true,
    });
}

// Convenience factory functions
export const createSpaceGraph = (container: HTMLElement, options?: SpaceGraphOptions) =>
    new SpaceGraph(container, options);

// SimpleGraph: minimal entry point for static graph dashboards
// No chrome, no ergonomics, no physics, no vision — just force layout + HTML nodes + edges + camera + events
export interface SimpleGraphOptions extends Omit<SpaceGraphOptions, 'chrome' | 'plugins'> {
    /** Force layout options */
    layout?: {
        spacing?: number;
        iterations?: number;
        seed?: number;
    };
}

/**
 * Create a minimal graph for dashboards: force layout, HTML nodes, edges, camera, events.
 * @example
 * ```ts
 * const sg = await SimpleGraph.create('#container', { nodes, edges });
 * sg.watch('node:click', (payload) => console.log('id' in payload ? payload.id : payload.node.id));
 * ```
 */
export const SimpleGraph = {
    async create(
        container: HTMLElement | string,
        spec: GraphSpec,
        options: SimpleGraphOptions = {},
    ): Promise<SpaceGraph> {
        const element =
            typeof container === 'string' ? document.querySelector(container) : container;
        if (!element) throw new Error(`Container not found: ${container}`);

        const { layout = {}, ...sgOptions } = options;
        const sg = new SpaceGraph(element as HTMLElement, {
            ...sgOptions,
            chrome: false,
            plugins: [],
            render: { ...(sgOptions.render ?? {}), depth: 'flat', renderMode: 'on-demand' },
        });
        await sg.init();
        sg.loadSpec(spec).render();

        // Apply force layout once
        if (spec.nodes && spec.nodes.length > 0) {
            await sg.layoutOnce('force-layout', {
                spacing: layout.spacing ?? 120,
                iterations: layout.iterations ?? 200,
                seed: layout.seed ?? 42,
                randomize: true,
            });
        }

        return sg;
    },
};
