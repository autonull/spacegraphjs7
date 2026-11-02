import { CameraControls, ObjectPoolManager, PluginManager, VisionManager } from './core';
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
    NodeSpec,
    Projection,
    SpaceGraphEvents,
    SpaceGraphOptions,
    SpecUpdate,
} from './types';
import { createLogger, safeClone, clamp01 } from './utils';
import type { CardFacing } from '@spacegraphjs/renderer';

// Internal controllers
import { CameraController } from './spacegraph/CameraController';
import { AnimationController } from './spacegraph/AnimationController';
import { DepthController } from './spacegraph/DepthController';
import { LifecycleController } from './spacegraph/LifecycleController';
import { StaticMethods } from './spacegraph/StaticMethods';
import { MathPool } from './core/pooling/ObjectPool';

const logger = createLogger('SpaceGraph');

export const VERSION = '8.5.0';

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

    // Controllers
    public readonly cameraController: CameraController;
    public readonly animationController: AnimationController;
    public readonly depthController: DepthController;
    public readonly lifecycleController: LifecycleController;

    /** Whether animations should be instant. Respects `reducedMotion` option, falls back to system preference. */
    get reducedMotion(): boolean {
        if (this.options.reducedMotion !== undefined) return this.options.reducedMotion;
        return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

    get nodeCount(): number { return this.graph.nodes.size; }
    get edgeCount(): number { return this.graph.edges.size; }
    get selected(): string[] { return this.selection.list; }
    get selectedNodes(): Node[] { return this.selected.map(id => this.graph.getNode(id)).filter((n): n is Node => n !== undefined); }
    get isEmpty(): boolean { return this.graph.nodes.size === 0; }
    get stats() { return { nodes: this.nodeCount, edges: this.edgeCount, plugins: this.pluginManager.pluginCount }; }

    // ============= Static Factory Methods (delegated to StaticMethods) =============
    static getContainerElement = StaticMethods.getContainerElement;
    static create = StaticMethods.create;
    static load = StaticMethods.load;
    static fromURL = StaticMethods.fromURL;
    static quickGraph = StaticMethods.quickGraph;
    static fromManifest = StaticMethods.fromManifest;

    // ============= Instance Methods =============
    async init(): Promise<void> { return this.lifecycleController.init(); }

    // --- Graph Manipulation ---
    loadSpec(spec: GraphSpec): this {
        spec.nodes?.forEach(node => this.graph.addNode(node));
        spec.edges?.forEach(edge => this.graph.addEdge(edge));
        return this;
    }

    update(spec: SpecUpdate): void {
        spec.nodes?.forEach(u => u.id && this.graph.updateNode(u.id, u));
        spec.edges?.forEach(u => u.id && this.graph.updateEdge(u.id, u));
    }

    export(): GraphSpec & { camera?: { position: [number, number, number]; target: [number, number, number] }; plugins?: Record<string, unknown> } {
        const spec: GraphSpec & { camera?: { position: [number, number, number]; target: [number, number, number] }; plugins?: Record<string, unknown> } = {
            nodes: [...this.graph.nodes.values()].map(node => ({
                id: node.id,
                type: node.constructor.name,
                label: node.label,
                position: [node.position.x, node.position.y, node.position.z] as [number, number, number],
                data: safeClone(node.data),
            })),
            edges: [...this.graph.edges.values()].map(edge => ({
                id: edge.id,
                type: edge.constructor.name,
                source: edge.source.id,
                target: edge.target.id,
                data: safeClone(edge.data),
            })),
        };
        if (this.cameraControls?.target) {
            const { camera } = this.renderer;
            const { target } = this.cameraControls;
            spec.camera = { position: [camera.position.x, camera.position.y, camera.position.z], target: [target.x, target.y, target.z] };
        }
        const pluginState = this.pluginManager.export();
        if (pluginState && Object.keys(pluginState).length > 0) spec.plugins = pluginState;
        return spec;
    }

    import(data: GraphImportData): void {
        this.graph.clear();
        this.loadSpec(data as GraphSpec);
        if (data.camera && this.cameraControls?.target) {
            const { camera } = this.renderer;
            const { target } = this.cameraControls;
            camera.position.set(...data.camera.position);
            target.set(...data.camera.target);
            const mathPool = MathPool.getInstance();
            const diff = mathPool.acquireVector3().subVectors(camera.position, target);
            this.cameraControls.spherical.radius = diff.length();
            const radius = this.cameraControls.spherical.radius;
            const ratio = radius > 0 ? clamp01(diff.y / radius) : 0;
            this.cameraControls.spherical.phi = Math.acos(ratio);
            this.cameraControls.spherical.theta = Math.atan2(diff.x, diff.z);
            mathPool.releaseVector3(diff);
            this.cameraControls.update();
        }
        if (data.plugins) this.pluginManager.import(data.plugins as Record<string, unknown>);
    }

    // --- Node/Edge Access ---
    getNode(id: string): Node | undefined { return this.graph.nodes.get(id); }
    getEdge(id: string): Edge | undefined { return this.graph.edges.get(id); }
    hasNode(id: string): boolean { return this.graph.nodes.has(id); }
    hasEdge(id: string): boolean { return this.graph.edges.has(id); }
    clear(): void { this.graph.clear(); }

    // --- Camera Controls (delegated) ---
    fitView(padding = 100, duration = 1.5, ids?: readonly string[], options?: { minScale?: number; insets?: FitInsets }): this {
        return this.cameraController.fitView(padding, duration, ids, options) as this;
    }
    focusNode(id: string, _padding = 100, duration = 1): this { return this.cameraController.focusNode(id, _padding, duration) as this; }
    center(x: number, y: number, z = 0): this { return this.cameraController.center(x, y, z) as this; }
    resetCamera(): this { return this.cameraController.resetCamera() as this; }
    setCamera(position: [number, number, number], target?: [number, number, number]): this { return this.cameraController.setCamera(position, target) as this; }
    setOrbitEnabled(enabled: boolean): this { return this.cameraController.setOrbitEnabled(enabled) as this; }
    setPolar(phi: number, theta: number, duration = 0): this { return this.cameraController.setPolar(phi, theta, duration) as this; }

    // --- Animation Loop (delegated) ---
    animate(timestamp = 0): void { this.animationController.animate(timestamp); }
    requestFrame(): void { this.animationController.requestFrame(); }
    render(): this { return this.animationController.render() as this; }
    pause(): void { this.animationController.pause(); }
    resume(): this { return this.animationController.resume() as this; }

    // --- Lifecycle (delegated) ---
    dispose(): void { this.lifecycleController.dispose(); }
    destroy(): void { this.lifecycleController.destroy(); }

    // --- Fluent Graph API ---
    addNode(spec: NodeSpec | Node): Node | null { return this.graph.addNode(spec); }
    addEdge(spec: EdgeSpec | Edge): Edge | null { return this.graph.addEdge(spec); }
    removeNode(id: string): void { this.graph.removeNode(id); }
    removeEdge(id: string): void { this.graph.removeEdge(id); }

    // --- Selection (fluent) ---
    select(target: string | readonly string[] | null): this { this.selection.select(target); return this; }
    clearSelection(): this { this.selection.clear(); return this; }
    toggleSelection(id: string): this { this.selection.toggle(id); return this; }
    deselect(id: string): this { this.selection.deselect(id); return this; }

    // --- Visibility ---
    show(id: string, visible = true): this { const node = this.graph.nodes.get(id); if (node) node.updateSpec({ data: { ...node.data, visible } }); return this; }
    hide(id: string): this { return this.show(id, false); }

    // --- Watch ---
    watch<K extends keyof SpaceGraphEvents>(type: K, callback: (data: SpaceGraphEvents[K]) => void): () => void {
        const handler = (data: SpaceGraphEvents[K]) => callback(data);
        this.events.on(type, handler);
        return () => this.events.off(type, handler);
    }

    // --- Layout ---
    async layout(name: string, options?: Record<string, unknown>): Promise<void> {
        const plugin = this.pluginManager.getPlugin(name);
        if (plugin && 'applyLayout' in plugin) await (plugin as { applyLayout: (opts?: Record<string, unknown>) => Promise<void> }).applyLayout(options);
    }
    layoutOnce(name: string, options?: Record<string, unknown>): Promise<void> { return this.layout(name, options); }
    setPositions(positions: Record<string, [number, number, number]>): this { this.graph.setPositions(positions); return this; }
    pinAll(pinned = true): this { this.graph.pinAll(pinned); return this; }

    // --- Projection ---
    get projection(): Projection { return this.renderer.projection; }
    setProjection(projection: Projection): this {
        this.renderer.setProjection(projection, this.cameraControls?.target);
        this.cameraControls?.setCamera(this.renderer.camera);
        this.events.emit('projection:change', { projection });
        this.cameraController.reportViewport(true);
        this.requestFrame();
        return this;
    }

    // --- Depth Spectrum ---
    get depth(): DepthMode { return this.depthController.depth; }
    setDepth(depth: DepthMode): this { return this.depthController.setDepth(depth) as this; }
    get cardFacing(): CardFacing { return this.depthController.cardFacing; }
    setCardFacing(facing: CardFacing): this { return this.depthController.setCardFacing(facing) as this; }
    applySceneFade(): this { return this.depthController.applySceneFade() as this; }

    // --- Zoom ---
    get zoom(): number { return this.renderer.getZoom(); }
    setZoom(value: number): this { this.renderer.setZoom(value); this.cameraControls?.update(); this.cameraController.reportViewport(true); this.requestFrame(); return this; }
    get viewport(): CameraViewport { return this.renderer.getViewport(); }

    // --- Input ---
    registerFingerings(): void {
        this.input.registerFingering(createCameraFingering(this.cameraControls), FingeringPriority.CAMERA);
        this.input.registerFingering(new PinchZoomFingering(this), FingeringPriority.PINCH_ZOOM);
        this.events.on('input:camera:wheel', e => this.#onCameraWheel(e as WheelEventData));
    }

    #onCameraWheel(e: WheelEventData): void {
        const canvas = this.renderer.renderer.domElement;
        zoomCameraOnWheel(this.cameraControls, canvas, e);
        (e as { originalEvent?: { preventDefault?: () => void } }).originalEvent?.preventDefault?.();
    }

    // --- Initialization ---
    #init(): void {
        this.animationController.setContinuousMode((this.options.render?.renderMode ?? 'on-demand') === 'continuous');
        this.lifecycleController.createCoreObjects();
        this.depthController.initialize(this.options.render?.depth ?? 'flat');
    }

    get disposed(): boolean { return this.lifecycleController.disposed; }
    reportViewport(force = false): void { this.cameraController.reportViewport(force); }

    // Test access
    inputManagerFactory(params: { sg: SpaceGraph; events: EventEmitter<SpaceGraphEvents> }): InputManager {
        return new InputManager(params);
    }
}

// Convenience factory functions
import { graph } from './builder';

export const createSpaceGraph = (container: HTMLElement, options?: SpaceGraphOptions) =>
    new SpaceGraph(container, options);

export const createGraph = () => graph();

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
 * sg.on('node:click', ({ node }) => console.log(node.id));
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

// Shorthand factories for quick graph creation
export const sg = createSpaceGraph;
export const qg = createGraph;
