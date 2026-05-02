// SpaceGraph.ts - Core graph visualization engine
import { Graph } from './core/Graph';
import { Renderer } from './core/Renderer';
import { PluginManager } from './core/PluginManager';
import { CameraControls } from './core/CameraControls';
import { EventSystem } from './core/events/EventSystem';
import { VisionManager } from './core/VisionManager';
import { ObjectPoolManager } from './core/ObjectPoolManager';
import { ErgonomicsAPI } from './core/Ergonomics';
import { InputManager } from './input/InputManager';
import { applyDefaultInputConfig } from './input/DefaultInputConfig';
import { createCameraFingering } from './input/fingerings';
import { createLogger, safeClone, wrapError, calculateFitView, DOMUtils } from './utils';
import { MathPool } from './core/pooling/ObjectPool';
import { FingeringPriority, Performance } from './core/constants';
import {
    DEFAULT_NODE_TYPES,
    DEFAULT_EDGE_TYPES,
    DEFAULT_LAYOUT_PLUGINS,
    DEFAULT_SYSTEM_PLUGINS,
    createQuickGraphSpec,
} from './core/defaults';
import type { GraphSpec, SpaceGraphOptions, SpecUpdate, GraphImportData } from './types';
import type { Node } from './nodes/Node';
import type { Edge } from './edges/Edge';

const logger = createLogger('SpaceGraph');

export class SpaceGraph {
    public static instances = new Set<SpaceGraph>();

    public readonly container: HTMLElement;
    public readonly options: SpaceGraphOptions;

    public renderer!: Renderer;
    public graph!: Graph;
    public pluginManager!: PluginManager;
    public cameraControls!: CameraControls;
    public events!: EventSystem;
    public vision!: VisionManager;
    public poolManager!: ObjectPoolManager<any>;
    public input!: InputManager;
    public ergo!: ErgonomicsAPI;

    #animationFrameId?: number;
    #lastTimestamp = 0;
    #animating = false;

    constructor(container: HTMLElement, options: SpaceGraphOptions = {}) {
        this.options = options;
        this.container = container;
        this.#init();
        SpaceGraph.instances.add(this);
    }

    #init(): void {
        this.poolManager = new ObjectPoolManager();
        this.events = new EventSystem();
        this.vision = new VisionManager(this);
        this.pluginManager = new PluginManager(this);
        this.renderer = new Renderer(this, this.container);
        this.graph = new Graph(this);
        this.ergo = new ErgonomicsAPI(this);
        this.cameraControls = new CameraControls(
            this.renderer.camera,
            this.container,
            this.options.cameraControls as Partial<
                import('./core/CameraControls').CameraControlsConfig
            >,
        );
        const config = (this.options.input as Record<string, any>) ?? {};
        this.input = new InputManager({ sg: this, events: this.events });
        applyDefaultInputConfig(this.input, this, config);
    }

    // ============= Static Factory Methods =============
    static getContainerElement(container: string | HTMLElement): HTMLElement | null {
        return typeof container === 'string' ? document.querySelector(container) : container;
    }

    static async create(
        container: string | HTMLElement,
        spec: GraphSpec,
        options?: SpaceGraphOptions,
    ): Promise<SpaceGraph> {
        const element = SpaceGraph.getContainerElement(container);
        if (!element) throw new Error(`[SpaceGraph] Container not found: "${container}"`);
        if (!SpaceGraph.checkWebGL()) logger.warn('WebGL not supported');

        const sg = new SpaceGraph(element, options);
        await sg.init();
        sg.loadSpec(spec).render();
        return sg;
    }

    static async load(
        container: string | HTMLElement,
        data: GraphImportData,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        const element = SpaceGraph.getContainerElement(container);
        if (!element) throw new Error(`[SpaceGraph] Container not found: "${container}"`);

        const sg = new SpaceGraph(element, options);
        try {
            await sg.init();
            sg.import(data).render();
        } catch (err) {
            throw wrapError(
                err,
                { namespace: 'SpaceGraph', operation: 'Import', reason: 'Failed to import data' },
                logger,
            );
        }
        return sg;
    }

    static async fromURL(
        url: string,
        container: string | HTMLElement,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        if (!url || typeof url !== 'string') throw new Error(`[SpaceGraph] Invalid URL: "${url}"`);
        if (!container) throw new Error('[SpaceGraph] Container is required');

        const sg = new SpaceGraph(container, options);
        try {
            await sg.init();
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            sg.loadSpec((await response.json()) as GraphSpec).render();
        } catch (err) {
            throw wrapError(
                err,
                {
                    namespace: 'SpaceGraph',
                    operation: 'fromURL',
                    reason: `Failed to load from ${url}`,
                },
                logger,
            );
        }
        return sg;
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
        return SpaceGraph.create(container, createQuickGraphSpec(nodes, edges), options);
    }

    static async fromManifest(
        origin: string,
        container: string | HTMLElement,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        const manifestUrl = `${origin}/.well-known/zui-manifest.json`;
        const response = await fetch(manifestUrl);
        if (!response.ok) throw new Error(`Failed to fetch manifest: ${response.statusText}`);
        const manifest = (await response.json()) as Record<string, any>;

        let spec: GraphSpec;
        if (manifest.spec) spec = manifest.spec as GraphSpec;
        else if (manifest.spec_url) {
            const specResponse = await fetch(manifest.spec_url as string);
            if (!specResponse.ok)
                throw new Error(`Failed to fetch spec: ${specResponse.statusText}`);
            spec = await specResponse.json();
        } else throw new Error('Manifest must include spec or spec_url');

        return SpaceGraph.create(container, spec, {
            ...options,
            initialLayout: manifest.initial_layout,
        });
    }

    // ============= Instance Methods =============
    async init(): Promise<void> {
        this.renderer.init();
        this.#registerDefaults();
        await this.pluginManager.initAll();
    }

    #registerDefaults(): void {
        DEFAULT_NODE_TYPES.forEach((cls) => this.pluginManager.registerNodeType(cls.name, cls));
        DEFAULT_EDGE_TYPES.forEach((cls) =>
            this.pluginManager.registerEdgeType(
                cls.name,
                cls as import('./core/TypeRegistry').EdgeConstructor,
            ),
        );
        DEFAULT_LAYOUT_PLUGINS.forEach(([cls, name]) =>
            this.pluginManager.register(name, new cls()),
        );
        DEFAULT_SYSTEM_PLUGINS.forEach(([cls, name]) =>
            this.pluginManager.register(name, new cls()),
        );
        this.#registerFingerings();
    }

    #registerFingerings(): void {
        this.input.registerFingering(
            createCameraFingering(this.cameraControls, 'orbit'),
            FingeringPriority.CAMERA_ORBIT,
        );
        this.input.registerFingering(
            createCameraFingering(this.cameraControls, 'pan'),
            FingeringPriority.CAMERA_PAN,
        );
        this.input.registerFingering(
            createCameraFingering(this.cameraControls, 'zoom'),
            FingeringPriority.CAMERA_ZOOM,
        );
    }

    // ============= Graph Manipulation =============
    loadSpec(spec: GraphSpec): this {
        spec.nodes?.forEach((node) => this.graph.addNode(node));
        spec.edges?.forEach((edge) => this.graph.addEdge(edge));
        return this;
    }

    update(spec: SpecUpdate): this {
        spec.nodes?.forEach((u) => u.id && this.graph.updateNode(u.id, u));
        spec.edges?.forEach((u) => u.id && this.graph.updateEdge(u.id, u));
        return this;
    }

    export(): GraphSpec & {
        camera?: { position: [number, number, number]; target: [number, number, number] };
        plugins?: Record<string, unknown>;
    } {
        const spec: GraphSpec & { camera?: any; plugins?: any } = {
            nodes: [...this.graph.nodes.values()].map((node) => ({
                id: node.id,
                type: node.constructor.name,
                label: node.label,
                position: [node.position.x, node.position.y, node.position.z] as [
                    number,
                    number,
                    number,
                ],
                data: safeClone(node.data),
            })),
            edges: Array.from(this.graph.edges.values()).map((edge) => ({
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
            spec.camera = {
                position: [camera.position.x, camera.position.y, camera.position.z],
                target: [target.x, target.y, target.z],
            };
        }

        const pluginState = this.pluginManager.export();
        if (pluginState && Object.keys(pluginState).length > 0) spec.plugins = pluginState;
        return spec;
    }

    import(data: GraphImportData): this {
        this.graph.clear();
        this.loadSpec(data as GraphSpec);

        if (data.camera && this.cameraControls?.target) {
            const { camera } = this.renderer;
            const { target } = this.cameraControls;
            camera.position.set(...data.camera.position);
            target.set(...data.camera.target);

            const diff = MathPool.getInstance()
                .acquireVector3()
                .subVectors(camera.position, target);
            this.cameraControls.spherical.radius = diff.length();
            const radius = this.cameraControls.spherical.radius;
            const ratio = radius > 0 ? Math.max(-1, Math.min(1, diff.y / radius)) : 0;
            this.cameraControls.spherical.phi = Math.acos(ratio);
            this.cameraControls.spherical.theta = Math.atan2(diff.x, diff.z);
            MathPool.getInstance().releaseVector3(diff);
            this.cameraControls.update();
        }

        if (data.plugins) this.pluginManager.import(data.plugins as Record<string, any>);
        return this;
    }

    // ============= Node/Edge Access =============
    getNode(id: string): Node | undefined {
        return this.graph.getNode(id);
    }
    getEdge(id: string): Edge | undefined {
        return this.graph.getEdge(id);
    }
    removeNode(id: string): boolean {
        return this.graph.removeNode(id);
    }
    removeEdge(id: string): boolean {
        return this.graph.removeEdge(id);
    }
    clear(): void {
        this.graph.clear();
    }

    // ============= Camera Controls =============
    fitView(padding: number = 100, duration: number = 1.5): this {
        const nodes = Array.from(this.graph.nodes.values());
        const fit = calculateFitView(nodes, this.renderer.camera, padding);
        if (fit) this.cameraControls.flyTo(fit.center, fit.cameraZ, duration);
        return this;
    }

    get cameraPosition(): [number, number, number] {
        return [
            this.renderer.camera.position.x,
            this.renderer.camera.position.y,
            this.renderer.camera.position.z,
        ];
    }

    get cameraTarget(): [number, number, number] {
        return this.cameraControls
            ? [
                  this.cameraControls.target.x,
                  this.cameraControls.target.y,
                  this.cameraControls.target.z,
              ]
            : [0, 0, 0];
    }

    // ============= Animation Loop =============
    animate(timestamp: number = 0): void {
        if (!this.#animating) return;
        this.#animationFrameId = requestAnimationFrame((t) => this.animate(t));
        this.renderer.beginFrameOptimization(timestamp);

        const delta =
            this.#lastTimestamp > 0 && timestamp > 0
                ? Math.min(
                      (timestamp - this.#lastTimestamp) / Performance.MS_PER_SEC,
                      Performance.MAX_DELTA_CLAMP,
                  )
                : Performance.DEFAULT_DELTA_TIME;
        this.#lastTimestamp = timestamp;

        this.pluginManager.updateAll(delta);
        for (const node of this.graph.nodes.values()) node.onPreRender?.(delta);
        for (const edge of this.graph.edges.values()) (edge as any).onPreRender?.(delta);

        this.cameraControls.update();
        this.renderer.updateCulling();
        this.renderer.render();
    }

    render(): this {
        this.#animating = true;
        this.#animationFrameId ??= requestAnimationFrame((t) => this.animate(t));
        return this;
    }

    pause(): void {
        this.#animating = false;
        if (this.#animationFrameId) {
            cancelAnimationFrame(this.#animationFrameId);
            this.#animationFrameId = undefined;
        }
    }

    resume(): this {
        return this.render();
    }

    // ============= Lifecycle =============
    dispose(): void {
        this.pause();
        this.pluginManager.disposePlugins();
        this.graph.clear();

        [this.renderer?.renderer, this.renderer?.cssRenderer]?.forEach((r) => {
            r?.domElement?.remove?.();
        });
        SpaceGraph.instances.delete(this);
    }

    destroy(): void {
        this.dispose();
    }

    // ============= Utility =============
    private static checkWebGL(): boolean {
        try {
            const canvas = DOMUtils.createElement('canvas');
            return !!(
                window.WebGLRenderingContext &&
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
            );
        } catch {
            return false;
        }
    }

    get isRendering(): boolean {
        return this.#animating;
    }
    get nodeCount(): number {
        return this.graph.nodes.size;
    }
    get edgeCount(): number {
        return this.graph.edges.size;
    }

    // ============= Ergonomic API (delegated to ErgonomicsAPI, which delegates to Graph) =============
    // Quick access
    $(id: string): Node | undefined { return this.graph.getNode(id); }
    $$(id: string): Node { return this.ergo.require(id); }
    $optional(id: string): Node | null { return this.graph.getNode(id) ?? null; }

    // Query - delegate to graph
    findNodes(predicate: (node: Node) => boolean): Node[] { return this.graph.query(predicate); }
    findNode(predicate: (node: Node) => boolean): Node | undefined { return this.graph.findNode(predicate); }
    getNodesByType(type: string): Node[] { return this.graph.queryByType(type); }
    findEdges(predicate: (edge: Edge) => boolean): Edge[] { const e = this.graph.findEdge(predicate); return e ? [e] : []; }
    getEdgesForNode(nodeId: string): Edge[] { return this.graph.getEdgesForNode(nodeId); }
    where(key: string, value: unknown): Node[] { return this.graph.query((n) => (n.data as Record<string, unknown>)[key] === value); }
    has(key: string, value?: unknown): Node[] { return value !== undefined ? this.where(key, value) : this.graph.query((n) => key in n.data); }
    neighbors(nodeId: string): Node[] { return this.graph.neighbors(nodeId); }
    adjacent(nodeId: string): Node[] { return this.graph.neighbors(nodeId); }
    connections(nodeId: string): Edge[] { return this.graph.getEdgesForNode(nodeId); }
    inEdges(nodeId: string): Edge[] { return this.graph.getIncomingEdges(nodeId); }
    outEdges(nodeId: string): Edge[] { return this.graph.getOutgoingEdges(nodeId); }

    // Iterators
    forNodes(callback: (node: Node) => void): void { this.graph.forEachNode(callback); }
    forEdges(callback: (edge: Edge) => void): void { this.graph.forEachEdge(callback); }
    forEach(callback: (node: Node) => void): void { this.graph.forEachNode(callback); }
    each(callback: (node: Node) => void): void { this.graph.forEachNode(callback); }
    map<T>(callback: (node: Node) => T): T[] { return this.graph.mapNodes(callback); }
    filter(callback: (node: Node) => boolean): Node[] { return this.graph.query(callback); }
    some(callback: (node: Node) => boolean): boolean { return this.graph.findNode(callback) !== undefined; }
    every(callback: (node: Node) => boolean): boolean { return this.graph.query((n) => !callback(n)).length === 0; }

    // Node operations
    add(spec: NodeSpec | Node): Node | null { return this.graph.addNode(spec); }
    create(spec: string | NodeSpec): Node | null { return typeof spec === 'string' ? this.graph.addNode({ id: spec, type: 'ShapeNode' }) : this.graph.addNode(spec); }
    remove(id: string): boolean { this.graph.removeNode(id); return true; }
    addNodes(specs: NodeSpec[]): Node[] { return this.graph.addNodes(specs); }
    removeWhere(predicate: (node: Node) => boolean): number { const nodes = this.graph.query(predicate); nodes.forEach((n) => this.graph.removeNode(n.id)); return nodes.length; }
    updateWhere(predicate: (node: Node) => boolean, updates: Partial<NodeSpec>): Node[] { return this.graph.query(predicate).map((n) => this.graph.updateNode(n.id, updates)).filter(Boolean) as Node[]; }

    // Edge operations
    connect(source: string, target: string, data?: Record<string, unknown>): Edge | null { return this.graph.addEdge({ id: `edge-${source}-${target}`, source, target, data }); }
    connectTo(source: string, targets: string | string[], data?: Record<string, unknown>): Edge[] { const arr = Array.isArray(targets) ? targets : [targets]; return arr.map((t) => this.connect(source, t, data)).filter(Boolean) as Edge[]; }
    connectFrom(sources: string | string[], target: string, data?: Record<string, unknown>): Edge[] { const arr = Array.isArray(sources) ? sources : [sources]; return arr.map((s) => this.connect(s, target, data)).filter(Boolean) as Edge[]; }
    disconnect(source: string, target: string): boolean { return this.graph.removeEdge(`edge-${source}-${target}`); }
    addEdges(specs: EdgeSpec[]): Edge[] { return this.graph.addEdges(specs); }

    // Traversal
    traverse(callback: (node: Node, depth: number) => void, startId?: string): void { this.graph.traverse(callback, startId); }
    bfs(callback: (node: Node, depth: number) => void, startId?: string): void { this.graph.bfs(callback, startId); }
    dfs(callback: (node: Node, depth: number) => void, startId?: string): void { this.graph.dfs(callback, startId); }
    getSubgraph(centerId: string, radius: number): { nodes: Node[]; edges: Edge[] } { return this.graph.getConnectedComponentInRadius(centerId, radius); }
    path(from: string, to: string): Node[] | null { return this.graph.findPath(from, to); }

    // Batch
    batch(fn: (sg: SpaceGraph) => void): void { fn(this); }
    freeze(): { release: () => void } { this.pause(); return { release: () => this.render() }; }
    suspend(): { resume: () => void } { this.pause(); return { resume: () => this.render() }; }
    transaction(updates: (sg: this) => void): void { this.pause(); try { updates(this); } finally { this.render(); } }

    // Selection
    select(nodeId: string): this { this.graph.getNode(nodeId)?.focus(); return this; }
    deselect(nodeId: string): this { this.graph.getNode(nodeId)?.blur(); return this; }
    selectAll(): this { this.graph.forEachNode((n) => n.focus()); return this; }
    deselectAll(): this { this.graph.forEachNode((n) => n.blur()); return this; }
    get selected(): Node[] { return this.graph.query((n) => n.focused); }

    // Visibility
    toggleVisibility(nodeId: string): boolean { const n = this.graph.getNode(nodeId); if (!n) return false; const v = !(n.data as Record<string, unknown>).visible; n.updateSpec({ data: { ...n.data, visible: v } }); return v; }
    toggle(nodeId: string): boolean { return this.toggleVisibility(nodeId); }
    show(id: string, visible = true): Node | null { const n = this.graph.getNode(id); if (!n) return null; n.updateSpec({ data: { ...n.data, visible } }); return n; }
    hide(id: string): Node | null { return this.show(id, false); }

    // Quick node utilities
    require(id: string): Node { const n = this.graph.getNode(id); if (!n) throw new Error(`Node not found: ${id}`); return n; }
    clone(id: string, newId?: string): Node | null { const orig = this.graph.getNode(id); if (!orig) return null; return this.graph.addNode({ id: newId ?? `${id}-copy`, type: orig.type, label: orig.label, position: [orig.position.x + 50, orig.position.y, orig.position.z + 50], data: { ...orig.data } }); }
    move(id: string, x: number, y: number, z = 0): Node | null { const n = this.graph.getNode(id); if (!n) return null; n.updatePosition(x, y, z); return n; }
    translate(id: string, dx: number, dy: number, dz = 0): Node | null { const n = this.graph.getNode(id); if (!n) return null; n.updatePosition(n.position.x + dx, n.position.y + dy, n.position.z + dz); return n; }
    shift(id: string, dx: number, dy: number, dz = 0): Node | null { return this.translate(id, dx, dy, dz); }
    label(id: string, text: string): Node | null { const n = this.graph.getNode(id); if (!n) return null; n.updateSpec({ label: text }); return n; }
    text(id: string, text: string): Node | null { return this.label(id, text); }
    color(id: string, color: string | number): Node | null { const n = this.graph.getNode(id); if (!n) return null; n.updateSpec({ data: { ...n.data, color } }); return n; }
    fill(id: string, color: string | number): Node | null { return this.color(id, color); }
    data(id: string, key: string, value?: unknown): unknown { const n = this.graph.getNode(id); if (!n) return undefined; if (value !== undefined) { n.updateSpec({ data: { ...n.data, [key]: value } }); return value; } return n.data[key]; }
    attr(id: string, key: string, value?: unknown): unknown { return this.data(id, key, value); }
    rotate(id: string, x: number, y: number, z: number): Node | null { const n = this.graph.getNode(id); if (!n) return null; n.updateSpec({ rotation: [x, y, z] }); return n; }
    scale(id: string, x: number, y?: number, z?: number): Node | null { const n = this.graph.getNode(id); if (!n) return null; n.updateSpec({ scale: [x, y ?? x, z ?? x] }); return n; }

    // ============= Quick Properties =============
    get size(): number { return this.graph.nodes.size; }
    get isEmpty(): boolean { return this.graph.nodes.size === 0; }
    get nodes(): Node[] { return [...this.graph.nodes.values()]; }
    get edges(): Edge[] { return [...this.graph.edges.values()]; }

    // Watch for changes - returns unsubscribe
    watch(
        type: 'node:added' | 'node:removed' | 'node:updated' | 'edge:added' | 'edge:removed' | 'edge:updated',
        callback: (data: any) => void,
    ): () => void {
        const handler = (data: any) => callback(data);
        this.events.on(type, handler);
        return () => this.events.off(type, handler);
    }

    // Get stats
    get stats() {
        return {
            nodes: this.graph.nodes.size,
            edges: this.graph.edges.size,
            plugins: this.pluginManager.pluginCount,
        };
    }

    // Quick layout application
    async layout(name: string, options?: Record<string, unknown>): Promise<void> {
        const plugin = this.pluginManager.getPlugin(name);
        if (plugin && 'applyLayout' in plugin) {
            await (plugin as { applyLayout: (opts?: Record<string, unknown>) => Promise<void> }).applyLayout(options);
        }
    }

    // Focus and animate camera to node
    focusNode(id: string, _padding: number = 100, duration: number = 1): this {
        const node = this.graph.getNode(id);
        if (node) {
            const pos = node.position;
            this.cameraControls.flyTo(pos, this.renderer.camera.position.length(), duration);
        }
        return this;
    }

    // Zoom to fit all nodes
    zoomFit(padding: number = 100, duration: number = 1.5): this {
        return this.fitView(padding, duration) as this;
    }

    // Center camera on point
    center(x: number, y: number, z: number = 0): this {
        this.cameraControls.target.set(x, y, z);
        this.cameraControls.update();
        return this;
    }

    // Reset camera to default
    resetCamera(): this {
        this.renderer.camera.position.set(0, 500, 500);
        this.cameraControls.target.set(0, 0, 0);
        this.cameraControls.update();
        return this;
    }

    // Get camera position
    get camera(): { position: [number, number, number]; target: [number, number, number] } {
        return {
            position: [this.renderer.camera.position.x, this.renderer.camera.position.y, this.renderer.camera.position.z],
            target: [this.cameraControls.target.x, this.cameraControls.target.y, this.cameraControls.target.z],
        };
    }

    // Set camera position
    setCamera(position: [number, number, number], target?: [number, number, number]): this {
        this.renderer.camera.position.set(...position);
        if (target) this.cameraControls.target.set(...target);
        this.cameraControls.update();
        return this;
    }
}
