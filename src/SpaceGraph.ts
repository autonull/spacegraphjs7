import { CameraControls, MathPool, ObjectPoolManager, PluginManager, VisionManager } from './core';
import { InputManager } from './input';
import { FingeringPriority, Performance } from './core/constants';
import {
    createQuickGraphSpec,
    DEFAULT_CHROME_PLUGINS,
    DEFAULT_EDGE_TYPES,
    DEFAULT_LAYOUT_PLUGINS,
    DEFAULT_NODE_TYPES,
    DEFAULT_SYSTEM_PLUGINS,
    nodeTypeName,
    type PluginCtor,
} from './core/defaults';

import { ErgonomicsAPI } from './core/Ergonomics';
import { EventEmitter } from './core/EventEmitter';
import { forwardGraphEvents } from './core/forwardEvents';
import { Graph } from './core/Graph';
import { WebGLRenderer } from './core/WebGLRenderer';
import { Selection } from './core/Selection';
import { Edge } from './edges/Edge';
import { applyDefaultInputConfig } from './input/DefaultInputConfig';
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
    ZuiManifest,
} from './types';
import { depthTreatment } from './depth/DepthCues';
import { calculateFitView, createLogger, DOMUtils, safeClone, wrapError, clamp01 } from './utils';
import type { CardFacing } from '@spacegraphjs/renderer';
import type { OrthographicCamera } from 'three';

// Internal controllers
import { CameraController } from './spacegraph/CameraController';
import { AnimationController } from './spacegraph/AnimationController';
import { GraphController } from './spacegraph/GraphController';
import { DepthController } from './spacegraph/DepthController';
import { InputController } from './spacegraph/InputController';
import { SelectionController } from './spacegraph/SelectionController';
import { LifecycleController } from './spacegraph/LifecycleController';
import { StaticMethods } from './spacegraph/StaticMethods';

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
    public readonly graphController: GraphController;
    public readonly depthController: DepthController;
    public readonly inputController: InputController;
    public readonly selectionController: SelectionController;
    public readonly lifecycleController: LifecycleController;

    // Internal state (delegated to controllers)
    get #disposed(): boolean {
        return this.lifecycleController.disposed;
    }

    get #initialized(): boolean {
        return this.lifecycleController.initialized;
    }

    get #depth(): DepthMode {
        return this.depthController.depth;
    }

    set #depth(value: DepthMode) {
        // Depth is managed by DepthController
    }

    get #cardFacing(): CardFacing {
        // Not directly accessible, managed by DepthController
        return 'auto';
    }

    get #continuousMode(): boolean {
        return this.animationController.continuousMode;
    }

    set #continuousMode(value: boolean) {
        this.animationController.setContinuousMode(value);
    }

    get #animating(): boolean {
        // Not directly accessible, managed by AnimationController
        return false;
    }

    get #lastTimestamp(): number {
        return 0;
    }

    get #scheduled(): boolean {
        return false;
    }

    get #lastZoom(): number {
        return this.cameraController['#lastZoom'];
    }

    get #lastCenter(): [number, number, number] {
        return this.cameraController['#lastCenter'];
    }

    /**
     * Whether animations should be instant. Respects the explicit `reducedMotion` option,
     * falling back to the system `prefers-reduced-motion` media query.
     */
    get reducedMotion(): boolean {
        if (this.options.reducedMotion !== undefined) return this.options.reducedMotion;
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }
        return false;
    }

    constructor(container: HTMLElement, options: SpaceGraphOptions = {}) {
        this.options = options;
        this.container = container;

        // Initialize controllers
        this.cameraController = new CameraController(this);
        this.animationController = new AnimationController(this);
        this.graphController = new GraphController(this);
        this.depthController = new DepthController(this);
        this.inputController = new InputController(this);
        this.selectionController = new SelectionController(this);
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
        return this.selection.list
            .map((id) => this.graph.getNode(id))
            .filter((node): node is Node => node !== undefined);
    }

    // ============= Quick Properties =============
    get isEmpty(): boolean {
        return this.graph.nodes.size === 0;
    }

    // Get stats
    get stats() {
        return {
            nodes: this.graph.nodes.size,
            edges: this.graph.edges.size,
            plugins: this.pluginManager.pluginCount,
        };
    }

    // ============= Static Factory Methods (delegated) =============
    static getContainerElement(container: string | HTMLElement): HTMLElement | null {
        return StaticMethods.getContainerElement(container);
    }

    static async create(
        container: string | HTMLElement,
        spec: GraphSpec,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        return StaticMethods.create(container, spec, options);
    }

    static async load(
        container: string | HTMLElement,
        data: GraphImportData,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        return StaticMethods.load(container, data, options);
    }

    static async fromURL(
        url: string,
        container: string | HTMLElement,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        return StaticMethods.fromURL(url, container, options);
    }

    static async quickGraph(
        container: string | HTMLElement,
        nodes: Array<{
            id: string;
            label?: string;
            position?: [number, number, number];
            data?: Record<string, unknown>;
        }>,
        edges?: Array<{ id: string; source: string; target: string }>,
        options?: SpaceGraphOptions,
    ): Promise<SpaceGraph> {
        return StaticMethods.quickGraph(container, nodes, edges, options);
    }

    static async fromManifest(
        origin: string,
        container: string | HTMLElement,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        return StaticMethods.fromManifest(origin, container, options);
    }

    // ============= Instance Methods (delegated to controllers) =============
    async init(): Promise<void> {
        return this.lifecycleController.init();
    }

    // ============= Graph Manipulation (delegated) =============
    loadSpec(spec: GraphSpec): this {
        return this.graphController.loadSpec(spec);
    }

    update(spec: SpecUpdate): void {
        this.graphController.update(spec);
    }

    export(): GraphSpec & {
        camera?: { position: [number, number, number]; target: [number, number, number] };
        plugins?: Record<string, unknown>;
    } {
        return this.graphController.export();
    }

    import(data: GraphImportData): void {
        this.graphController.import(data);
    }

    // ============= Node/Edge Access (delegated) =============
    getNode(id: string): Node | undefined {
        return this.graphController.getNode(id);
    }

    getEdge(id: string): Edge | undefined {
        return this.graphController.getEdge(id);
    }

    hasNode(id: string): boolean {
        return this.graphController.hasNode(id);
    }

    hasEdge(id: string): boolean {
        return this.graphController.hasEdge(id);
    }

    clear(): void {
        this.graphController.clear();
    }

    // ============= Camera Controls (delegated) =============
    fitView(
        padding = 100,
        duration = 1.5,
        ids?: readonly string[],
        options?: { minScale?: number; insets?: FitInsets },
    ): this {
        return this.cameraController.fitView(padding, duration, ids, options);
    }

    focusNode(id: string, _padding = 100, duration = 1): this {
        return this.cameraController.focusNode(id, _padding, duration);
    }

    center(x: number, y: number, z = 0): this {
        return this.cameraController.center(x, y, z);
    }

    resetCamera(): this {
        return this.cameraController.resetCamera();
    }

    setCamera(position: [number, number, number], target?: [number, number, number]): this {
        return this.cameraController.setCamera(position, target);
    }

    setOrbitEnabled(enabled: boolean): this {
        return this.cameraController.setOrbitEnabled(enabled);
    }

    setPolar(phi: number, theta: number, duration = 0): this {
        return this.cameraController.setPolar(phi, theta, duration);
    }

    // ============= Animation Loop (delegated) =============
    animate(timestamp = 0): void {
        this.animationController.animate(timestamp);
    }

    requestFrame(): void {
        this.animationController.requestFrame();
    }

    render(): this {
        return this.animationController.render();
    }

    pause(): void {
        this.animationController.pause();
    }

    resume(): this {
        return this.animationController.resume();
    }

    // ============= Lifecycle (delegated) =============
    dispose(): void {
        this.lifecycleController.dispose();
    }

    destroy(): void {
        this.lifecycleController.destroy();
    }

    // Fluent API shortcuts for graph manipulation (delegated)
    addNode(spec: NodeSpec | Node): Node | null {
        return this.graphController.addNode(spec);
    }

    addEdge(spec: EdgeSpec | Edge): Edge | null {
        return this.graphController.addEdge(spec);
    }

    removeNode(id: string): void {
        this.graphController.removeNode(id);
    }

    removeEdge(id: string): void {
        this.graphController.removeEdge(id);
    }

    // Selection (delegated)
    select = (target: string | readonly string[] | null) => {
        return this.selectionController.select(target);
    };

    clearSelection = () => {
        return this.selectionController.clearSelection();
    };

    toggleSelection = (id: string) => {
        return this.selectionController.toggleSelection(id);
    };

    deselect = (id: string) => {
        return this.selectionController.deselect(id);
    };

    // Visibility
    show(id: string, visible = true): this {
        const node = this.graph.getNode(id);
        if (node) node.updateSpec({ data: { ...node.data, visible } });
        return this;
    }

    hide(id: string): this {
        return this.show(id, false);
    }

    // Watch for changes - returns unsubscribe
    watch<K extends keyof SpaceGraphEvents>(
        type: K,
        callback: (data: SpaceGraphEvents[K]) => void,
    ): () => void {
        const handler = (data: SpaceGraphEvents[K]) => callback(data);
        this.events.on(type, handler);
        return () => this.events.off(type, handler);
    }

    // Quick layout application (delegated)
    async layout(name: string, options?: Record<string, unknown>): Promise<void> {
        return this.graphController.layout(name, options);
    }

    // Apply absolute positions without animation (delegated)
    setPositions(positions: Record<string, [number, number, number]>): this {
        return this.graphController.setPositions(positions);
    }

    // Pin every node so an implicit layout cannot move host-assigned positions (delegated)
    pinAll(pinned = true): this {
        return this.graphController.pinAll(pinned);
    }

    // Apply a named layout exactly once (delegated)
    layoutOnce(name: string, options?: Record<string, unknown>): Promise<void> {
        return this.graphController.layoutOnce(name, options);
    }

    // ============= Projection and zoom telemetry (L1.12/L1.13) =============
    get projection(): Projection {
        return this.graphController.projection;
    }

    // Switch the active camera between parallel (2D) and perspective (3D) projection (delegated)
    setProjection(projection: Projection): this {
        return this.graphController.setProjection(projection);
    }

    // ============= Depth spectrum (LE.14) (delegated) =============
    get depth(): DepthMode {
        return this.depthController.depth;
    }

    // Apply a depth treatment (delegated)
    setDepth(depth: DepthMode): this {
        return this.depthController.setDepth(depth);
    }

    // ============= Card facing (T1.19) (delegated) =============
    get cardFacing(): CardFacing {
        return this.depthController.cardFacing;
    }

    setCardFacing(facing: CardFacing): this {
        return this.depthController.setCardFacing(facing);
    }

    // Apply scene fade (delegated)
    applySceneFade(): this {
        return this.depthController.applySceneFade();
    }

    // Normalized 0..1 zoom where 1 is closest; the host maps it to semantic levels.
    get zoom(): number {
        return this.renderer.getZoom();
    }

    setZoom(value: number): this {
        this.renderer.setZoom(value);
        this.cameraControls?.update();
        this.cameraController.reportViewport(true);
        this.requestFrame();
        return this;
    }

    get viewport(): CameraViewport {
        return this.renderer.getViewport();
    }

    // ============= Initialization =============
    #init(): void {
        this.#continuousMode = (this.options.render?.renderMode ?? 'on-demand') === 'continuous';
        this.lifecycleController.createCoreObjects();
        this.depthController.initialize(this.options.render?.depth ?? 'flat');
    }

    // Public accessors for controllers
    get disposed(): boolean {
        return this.lifecycleController.disposed;
    }

    reportViewport(force = false): void {
        this.cameraController.reportViewport(force);
    }

    // Provide access to internal InputManager factory for tests
    inputManagerFactory(params: {
        sg: SpaceGraph;
        events: EventEmitter<SpaceGraphEvents>;
    }): InputManager {
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

// Quick node creation shortcuts
export const node = (id: string, type = 'ShapeNode', position?: [number, number, number]) => ({
    id,
    type,
    position,
});
export const edge = (id: string, source: string, target: string) => ({ id, source, target });
