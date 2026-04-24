import { Graph } from './core/Graph';
import { Renderer } from './core/Renderer';
import { PluginManager } from './core/PluginManager';
import { CameraControls, type CameraControlsConfig } from './core/CameraControls';
import { EventSystem } from './core/events/EventSystem';
import { VisionManager } from './core/VisionManager';
import { ObjectPoolManager } from './core/ObjectPoolManager';
import { InputManager } from './input/InputManager';
import { applyDefaultInputConfig, type DefaultInputConfig } from './input/DefaultInputConfig';
import {
    CameraOrbitingFingering,
    CameraPanningFingering,
    CameraZoomingFingering,
} from './input/fingerings';
import { createLogger } from './utils/logger';
import { wrapError } from './utils/error';
import { safeClone } from './utils/math';
import {
    DEFAULT_NODE_TYPES,
    DEFAULT_EDGE_TYPES,
    DEFAULT_LAYOUT_PLUGINS,
    DEFAULT_SYSTEM_PLUGINS,
    createQuickGraphSpec,
} from './core/defaults';
import { FingeringPriority, Performance } from './core/constants';

import type { GraphSpec, SpaceGraphOptions, SpecUpdate } from './types';
import { MathPool } from './core/pooling/ObjectPool';
import { CameraUtils } from './utils/CameraUtils';
import { DOMUtils } from './utils/DOMUtils';

const logger = createLogger('SpaceGraph');

export class SpaceGraph {
    public static instances: Set<SpaceGraph> = new Set();
    public container: HTMLElement;
    public renderer!: Renderer;
    public graph!: Graph;
    public pluginManager!: PluginManager;
    public cameraControls!: CameraControls;
    public events!: EventSystem;
    public vision!: VisionManager;
    public poolManager!: ObjectPoolManager<any>;
    public input!: InputManager;
    public options: SpaceGraphOptions;
    private animationFrameId?: number;
    private lastTimestamp: number = 0;
    private _animating: boolean = false;

    constructor(container: HTMLElement, options: SpaceGraphOptions = {}) {
        this.options = options;
        this.container = container;
        this.initializeCoreServices();
        this.initializeInput();
        SpaceGraph.instances.add(this);
    }

    private initializeCoreServices(): void {
        this.poolManager = new ObjectPoolManager();
        this.events = new EventSystem();
        this.vision = new VisionManager(this);
        this.pluginManager = new PluginManager(this);
        this.renderer = new Renderer(this, this.container);
        this.graph = new Graph(this);
        this.cameraControls = new CameraControls(
            this.renderer.camera,
            this.container,
            this.options.cameraControls as Partial<CameraControlsConfig>,
        );
    }

    private initializeInput(): void {
        const inputConfig = 'input' in this.options
            ? (this.options.input as DefaultInputConfig | undefined)
            : {};

        const config = inputConfig && typeof inputConfig !== 'boolean'
            ? inputConfig
            : {};

        this.input = new InputManager({ graph: this, events: this.events });
        applyDefaultInputConfig(this.input, this, config);
    }

    static getContainerElement(container: string | HTMLElement): HTMLElement | null {
        return typeof container === 'string'
            ? (document.querySelector(container) as HTMLElement)
            : container;
    }

    static async create(
        container: string | HTMLElement,
        spec: GraphSpec,
        options?: SpaceGraphOptions,
    ): Promise<SpaceGraph> {
        const element = SpaceGraph.getContainerElement(container);
        if (!element) {
            throw new Error(
                `[SpaceGraph] Initialization Error: Container not found for selector/element "${container}". ` +
                    `Make sure the element exists in the DOM before calling create().`,
            );
        }

        if (!SpaceGraph.checkWebGL()) {
            logger.warn(
                'WebGL not supported on this device. Rendering may fail or perform poorly.',
            );
        }

        const graph = new SpaceGraph(element, options);
        await graph.init();
        graph.loadSpec(spec);
        graph.render();
        return graph;
    }

    async init() {
        this.renderer.init();
        this.registerNodeTypes();
        this.registerEdgeTypes();
        this.registerLayouts();
        this.registerSystemPlugins();
        this.registerFingerings();
        await this.pluginManager.initAll();
    }

    private registerNodeTypes(): void {
        for (const cls of DEFAULT_NODE_TYPES) {
            this.pluginManager.registerNodeType(cls.name, cls);
        }
    }

    private registerEdgeTypes(): void {
        for (const cls of DEFAULT_EDGE_TYPES) {
            this.pluginManager.registerEdgeType(
                cls.name,
                cls as import('./core/TypeRegistry').EdgeConstructor,
            );
        }
    }

    private registerLayouts(): void {
        for (const [cls, name] of DEFAULT_LAYOUT_PLUGINS) {
            this.pluginManager.register(name, new cls());
        }
    }

    private registerSystemPlugins(): void {
        for (const [cls, name] of DEFAULT_SYSTEM_PLUGINS) {
            this.pluginManager.register(name, new cls());
        }
    }

    private registerFingerings(): void {
        this.input.registerFingering(new CameraOrbitingFingering(this.cameraControls), FingeringPriority.CAMERA_ORBIT);
        this.input.registerFingering(new CameraPanningFingering(this.cameraControls), FingeringPriority.CAMERA_PAN);
        this.input.registerFingering(new CameraZoomingFingering(this.cameraControls), FingeringPriority.CAMERA_ZOOM);
    }

    loadSpec(spec: GraphSpec): void {
        spec.nodes?.forEach((nodeSpec) => this.graph.addNode(nodeSpec));
        spec.edges?.forEach((edgeSpec) => this.graph.addEdge(edgeSpec));
    }

    update(spec: SpecUpdate): void {
        spec.nodes?.forEach((nodeUpdate) => nodeUpdate.id && this.graph.updateNode(nodeUpdate.id, nodeUpdate));
        spec.edges?.forEach((edgeUpdate) => edgeUpdate.id && this.graph.updateEdge(edgeUpdate.id, edgeUpdate));
    }

    export(): GraphSpec & {
        camera?: { position: [number, number, number]; target: [number, number, number] };
        plugins?: Record<string, any>;
    } {
        const spec: any = {
            nodes: [...this.graph.nodes.values()].map((node) => ({
                id: node.id,
                type: node.constructor.name,
                label: node.label,
                position: [node.position.x, node.position.y, node.position.z],
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
        if (pluginState && Object.keys(pluginState).length > 0) {
            spec.plugins = pluginState;
        }

        return spec;
    }

    import(data: any): void {
        this.graph.clear();
        this.loadSpec(data);

        if (data.camera && this.cameraControls?.target) {
            this.renderer.camera.position.set(
                data.camera.position[0],
                data.camera.position[1],
                data.camera.position[2],
            );
            this.cameraControls.target.set(
                data.camera.target[0],
                data.camera.target[1],
                data.camera.target[2],
            );

            const diff = MathPool.getInstance()
                .acquireVector3()
                .subVectors(this.renderer.camera.position, this.cameraControls.target);
            this.cameraControls.spherical.radius = diff.length();
            const radius = this.cameraControls.spherical.radius;
            const ratio = radius > 0 ? Math.max(-1, Math.min(1, diff.y / radius)) : 0;
            this.cameraControls.spherical.phi = Math.acos(ratio);
            this.cameraControls.spherical.theta = Math.atan2(diff.x, diff.z);
            MathPool.getInstance().releaseVector3(diff);

            this.cameraControls.update();
        }

        if (data.plugins) {
            this.pluginManager.import(data.plugins);
        }
    }

    fitView(padding: number = 100, duration: number = 1.5): void {
        const nodes = Array.from(this.graph.nodes.values());
        const fit = CameraUtils.calculateFitView(nodes, this.renderer.camera, padding);
        if (fit) {
            this.cameraControls.flyTo(fit.center, fit.cameraZ, duration);
        }
    }

    animate(timestamp: number = 0) {
        if (!this._animating) return;
        this.animationFrameId = requestAnimationFrame((t) => this.animate(t));

        this.renderer.beginFrameOptimization(timestamp);

        const delta = this.lastTimestamp > 0 && timestamp > 0
            ? Math.min((timestamp - this.lastTimestamp) / Performance.MS_PER_SEC, Performance.MAX_DELTA_CLAMP)
            : Performance.DEFAULT_DELTA_TIME;
        this.lastTimestamp = timestamp;

        this.pluginManager.updateAll(delta);

        for (const node of this.graph.nodes.values()) {
            node.onPreRender?.(delta);
        }
        for (const edge of this.graph.edges.values()) {
            (edge as unknown as { onPreRender?: (dt: number) => void }).onPreRender?.(delta);
        }

        this.cameraControls.update();
        this.renderer.updateCulling();
        this.renderer.render();
    }

    render(): void {
        this._animating = true;
        this.animationFrameId ??= requestAnimationFrame((t) => this.animate(t));
    }

    dispose(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = undefined;
        }
        this._animating = false;

        this.pluginManager.disposePlugins();
        this.graph.clear();

        if (this.renderer) {
            if (
                this.renderer.renderer?.domElement &&
                this.container.contains(this.renderer.renderer.domElement)
            ) {
                this.container.removeChild(this.renderer.renderer.domElement);
            }
            if (
                this.renderer.cssRenderer?.domElement &&
                this.container.contains(this.renderer.cssRenderer.domElement)
            ) {
                this.container.removeChild(this.renderer.cssRenderer.domElement);
            }
        }

        SpaceGraph.instances.delete(this);
    }

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

    public static async load(
        container: string | HTMLElement,
        data: unknown,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        const element = SpaceGraph.getContainerElement(container);
        if (!element) {
            throw new Error(`[SpaceGraph] Import Error: Container not found for "${container}".`);
        }

        const sg = new SpaceGraph(element, options);
        try {
            await sg.init();
            sg.import(data);
            sg.render();
        } catch (err) {
            throw wrapError(err, { namespace: 'SpaceGraph', operation: 'Import', reason: 'Failed to import data' }, logger);
        }
        return sg;
    }

    public static async fromURL(
        url: string,
        container: HTMLElement,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        if (!url || typeof url !== 'string') {
            throw new Error(`[SpaceGraph] fromURL Error: Invalid URL "${url}".`);
        }
        if (!container) {
            throw new Error('[SpaceGraph] fromURL Error: Container element is undefined or null.');
        }

        const sg = new SpaceGraph(container, options);
        try {
            await sg.init();
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }
            const spec: GraphSpec = await response.json();
            sg.loadSpec(spec);
            sg.render();
        } catch (err) {
            throw wrapError(err, { namespace: 'SpaceGraph', operation: 'fromURL', reason: `Failed to load graph from ${url}` }, logger);
        }
        return sg;
    }

    public static async quickGraph(
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

    public static async fromManifest(
        origin: string,
        container: string | HTMLElement,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        const manifestUrl = `${origin}/.well-known/zui-manifest.json`;
        const response = await fetch(manifestUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch ZUI manifest: ${response.statusText}`);
        }
        const manifest = (await response.json()) as Record<string, unknown>;
        let spec: GraphSpec;
        if (manifest.spec) {
            spec = manifest.spec as GraphSpec;
        } else if (manifest.spec_url) {
            const specResponse = await fetch(manifest.spec_url as string);
            if (!specResponse.ok) {
                throw new Error(`Failed to fetch spec_url: ${specResponse.statusText}`);
            }
            spec = await specResponse.json();
        } else {
            throw new Error('Manifest must include spec or spec_url');
        }
        return SpaceGraph.create(container, spec, {
            ...options,
            initialLayout: manifest.initial_layout as string | undefined,
        });
    }
}
