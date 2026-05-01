// SpaceGraph.ts - Core graph visualization engine
import { Graph } from './core/Graph';
import { Renderer } from './core/Renderer';
import { PluginManager } from './core/PluginManager';
import { CameraControls } from './core/CameraControls';
import { EventSystem } from './core/events/EventSystem';
import { VisionManager } from './core/VisionManager';
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

    // Ergonomic: iterate nodes
    forNodes(callback: (node: Node) => void): void {
        this.graph.forEachNode(callback);
    }

    // Ergonomic: iterate edges
    forEdges(callback: (edge: Edge) => void): void {
        this.graph.forEachEdge(callback);
    }

    // Ergonomic: find nodes by predicate
    findNodes(predicate: (node: Node) => boolean): Node[] {
        return this.graph.query(predicate);
    }

    // Ergonomic: find first node matching predicate
    findNode(predicate: (node: Node) => boolean): Node | undefined {
        return this.graph.findNode(predicate);
    }

    // Ergonomic: get nodes by type
    getNodesByType(type: string): Node[] {
        return this.graph.queryByType(type);
    }

    // Ergonomic: find edges by predicate
    findEdges(predicate: (edge: Edge) => boolean): Edge[] {
        const results: Edge[] = [];
        for (const edge of this.graph.edges.values()) {
            if (predicate(edge)) results.push(edge);
        }
        return results;
    }

    // Ergonomic: get edges connected to a node
    getEdgesForNode(nodeId: string): Edge[] {
        return this.graph.getEdgesForNode(nodeId);
    }

    // ========== Ergonomic Shortcuts ==========
    // Add node with fluent API - returns node for chaining
    add(spec: NodeSpec | Node): Node | null {
        return this.graph.addNode(spec);
    }

    // Add edge with fluent API - returns edge for chaining
    connect(source: string, target: string, data?: Record<string, unknown>): Edge | null {
        const edgeSpec = {
            id: `edge-${source}-${target}`,
            source,
            target,
            data,
        };
        return this.graph.addEdge(edgeSpec);
    }

    // Remove by predicate
    removeWhere(predicate: (node: Node) => boolean): number {
        let count = 0;
        this.graph.nodes.forEach((node, id) => {
            if (predicate(node)) {
                this.graph.removeNode(id);
                count++;
            }
        });
        return count;
    }

    // Update nodes matching criteria
    updateWhere(
        predicate: (node: Node) => boolean,
        updates: Partial<NodeSpec>,
    ): Node[] {
        const updated: Node[] = [];
        this.graph.nodes.forEach((node) => {
            if (predicate(node)) {
                const updatedNode = this.graph.updateNode(node.id, updates);
                if (updatedNode) updated.push(updatedNode);
            }
        });
        return updated;
    }

    // Batch add nodes
    addNodes(specs: NodeSpec[]): Node[] {
        const results: Node[] = [];
        for (const spec of specs) {
            const node = this.graph.addNode(spec);
            if (node) results.push(node);
        }
        return results;
    }

    // Batch add edges
    addEdges(specs: EdgeSpec[]): Edge[] {
        const results: Edge[] = [];
        for (const spec of specs) {
            const edge = this.graph.addEdge(spec);
            if (edge) results.push(edge);
        }
        return results;
    }

    // Traverse graph - depth-first
    traverse(callback: (node: Node, depth: number) => void, startId?: string): void {
        const visited = new Set<string>();
        const traverseRecursive = (nodeId: string, depth: number) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);
            const node = this.graph.getNode(nodeId);
            if (!node) return;
            callback(node, depth);
            for (const neighbor of this.graph.neighbors(nodeId)) {
                traverseRecursive(neighbor.id, depth + 1);
            }
        };
        if (startId) traverseRecursive(startId, 0);
        else for (const node of this.graph.nodes.values()) {
            traverseRecursive(node.id, 0);
        }
    }

    // Get subgraph within distance
    getSubgraph(centerId: string, radius: number): { nodes: Node[]; edges: Edge[] } {
        const center = this.graph.getNode(centerId);
        if (!center) return { nodes: [], edges: [] };

        const inRadius = new Set<string>();
        const centerPos = center.position;

        for (const [id, node] of this.graph.nodes) {
            const dist = node.position.distanceTo(centerPos);
            if (dist <= radius) inRadius.add(id);
        }

        const nodes = [...inRadius].map((id) => this.graph.getNode(id)!).filter(Boolean);
        const edges = [...inRadius].flatMap((id) => this.graph.getEdgesForNode(id))
            .filter((e) => inRadius.has(e.source.id) && inRadius.has(e.target.id));

        return { nodes, edges };
    }

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

    // Ergonomic: Get all nodes as array
    get nodes(): Node[] {
        return [...this.graph.nodes.values()];
    }

    // Ergonomic: Get all edges as array
    get edges(): Edge[] {
        return [...this.graph.edges.values()];
    }

    // Ergonomic: Quick layout application
    async layout(name: string, options?: Record<string, unknown>): Promise<void> {
        const plugin = this.pluginManager.getPlugin(name);
        if (plugin && 'applyLayout' in plugin) {
            await (plugin as { applyLayout: (opts?: Record<string, unknown>) => Promise<void> }).applyLayout(options);
        }
    }

    // Ergonomic: Batch update nodes
    batch(fn: (sg: SpaceGraph) => void): void {
        fn(this);
    }

    // Ergonomic: Freeze rendering during batch updates
    freeze(): { release: () => void } {
        this.pause();
        return {
            release: () => this.render(),
        };
    }

    // Ergonomic: Selection shortcuts
    select(nodeId: string): this {
        const node = this.graph.getNode(nodeId);
        if (node) node.focus();
        return this;
    }

    deselect(nodeId: string): this {
        const node = this.graph.getNode(nodeId);
        if (node) node.blur();
        return this;
    }

    selectAll(): this {
        for (const node of this.graph.nodes.values()) node.focus();
        return this;
    }

    deselectAll(): this {
        for (const node of this.graph.nodes.values()) node.blur();
        return this;
    }

    // Ergonomic: Toggle node visibility
    toggleVisibility(nodeId: string): boolean {
        const node = this.graph.getNode(nodeId);
        if (!node) return false;
        const visible = !(node.data as Record<string, unknown>).visible;
        node.updateSpec({ data: { ...node.data, visible } });
        return visible;
    }

    // Ergonomic: Quick node lookup
    $(id: string): Node | undefined {
        return this.graph.getNode(id);
    }

    // Ergonomic: Get node or throw
    require(id: string): Node {
        const node = this.graph.getNode(id);
        if (!node) throw new Error(`Node not found: ${id}`);
        return node;
    }
}
