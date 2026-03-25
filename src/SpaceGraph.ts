import { Graph } from './core/Graph';
import { Renderer } from './core/Renderer';
import { PluginManager } from './core/PluginManager';
import { CameraControls } from './core/CameraControls';
import { EventManager } from './core/EventManager';
import { VisionManager } from './core/VisionManager';
import { ObjectPoolManager } from './core/ObjectPoolManager';
import { CullingManager } from './core/CullingManager';
import { AdvancedRenderingOptimizer } from './core/AdvancedRenderingOptimizer';
import { InputManager } from './input/InputManager';
import { applyDefaultInputConfig, DefaultInputConfig } from './input/DefaultInputConfig';
import { createLogger } from './utils/logger';

import type { GraphSpec, SpaceGraphOptions, SpecUpdate, ISpaceGraphPlugin } from './types';
import { MathPool } from './utils/MathPool';
import { CameraUtils } from './utils/CameraUtils';
import { DOMUtils } from './utils/DOMUtils';

import { ShapeNode } from './nodes/ShapeNode';
import { InstancedShapeNode } from './nodes/InstancedShapeNode';
import { HtmlNode } from './nodes/HtmlNode';
import { ImageNode } from './nodes/ImageNode';
import { GroupNode } from './nodes/GroupNode';
import { NoteNode } from './nodes/NoteNode';
import { DataNode } from './nodes/DataNode';
import { CanvasNode } from './nodes/CanvasNode';
import { TextMeshNode } from './nodes/TextMeshNode';
import { VideoNode } from './nodes/VideoNode';
import { IFrameNode } from './nodes/IFrameNode';
import { ChartNode } from './nodes/ChartNode';
import { MarkdownNode } from './nodes/MarkdownNode';
import { GlobeNode } from './nodes/GlobeNode';
import { SceneNode } from './nodes/SceneNode';
import { AudioNode } from './nodes/AudioNode';
import { MathNode } from './nodes/MathNode';
import { ProcessNode } from './nodes/ProcessNode';
import { CodeEditorNode } from './nodes/CodeEditorNode';

import { Edge } from './edges/Edge';
import { CurvedEdge } from './edges/CurvedEdge';
import { FlowEdge } from './edges/FlowEdge';
import { LabeledEdge } from './edges/LabeledEdge';
import { DottedEdge } from './edges/DottedEdge';
import { DynamicThicknessEdge } from './edges/DynamicThicknessEdge';
import { AnimatedEdge } from './edges/AnimatedEdge';
import { BundledEdge } from './edges/BundledEdge';
import { InterGraphEdge } from './edges/InterGraphEdge';

import { ForceLayout } from './plugins/ForceLayout';
import { CircularLayout } from './plugins/CircularLayout';
import { GridLayout } from './plugins/GridLayout';
import { HierarchicalLayout } from './plugins/HierarchicalLayout';
import { RadialLayout } from './plugins/RadialLayout';
import { TreeLayout } from './plugins/TreeLayout';
import { SpectralLayout } from './plugins/SpectralLayout';
import { GeoLayout } from './plugins/GeoLayout';
import { TimelineLayout } from './plugins/TimelineLayout';
import { ClusterLayout } from './plugins/ClusterLayout';
import { InteractionPlugin } from './plugins/InteractionPlugin';
import { LODPlugin } from './plugins/LODPlugin';
import { AutoLayoutPlugin } from './plugins/AutoLayoutPlugin';
import { AutoColorPlugin } from './plugins/AutoColorPlugin';
import { MinimapPlugin } from './plugins/MinimapPlugin';
import { ErgonomicsPlugin } from './plugins/ErgonomicsPlugin';
import { PhysicsPlugin } from './plugins/PhysicsPlugin';
import { HUDPlugin } from './plugins/HUDPlugin';
import { HistoryPlugin } from './plugins/HistoryPlugin';

const logger = createLogger('SpaceGraph');

type PluginCtor = new () => ISpaceGraphPlugin;

const NODE_TYPES = [
    ShapeNode,
    InstancedShapeNode,
    HtmlNode,
    ImageNode,
    GroupNode,
    NoteNode,
    DataNode,
    CanvasNode,
    TextMeshNode,
    VideoNode,
    IFrameNode,
    ChartNode,
    MarkdownNode,
    GlobeNode,
    SceneNode,
    AudioNode,
    MathNode,
    ProcessNode,
    CodeEditorNode,
] as const;

const EDGE_TYPES = [
    Edge,
    CurvedEdge,
    FlowEdge,
    LabeledEdge,
    DottedEdge,
    DynamicThicknessEdge,
    AnimatedEdge,
    BundledEdge,
    InterGraphEdge,
] as const;

const LAYOUT_PLUGINS: [PluginCtor, string][] = [
    [ForceLayout, 'ForceLayout'],
    [CircularLayout, 'CircularLayout'],
    [GridLayout, 'GridLayout'],
    [HierarchicalLayout, 'HierarchicalLayout'],
    [RadialLayout, 'RadialLayout'],
    [TreeLayout, 'TreeLayout'],
    [SpectralLayout, 'SpectralLayout'],
    [GeoLayout, 'GeoLayout'],
    [GeoLayout, 'MapLayout'],
    [TimelineLayout, 'TimelineLayout'],
    [ClusterLayout, 'ClusterLayout'],
];

const SYSTEM_PLUGINS: [PluginCtor, string][] = [
    [InteractionPlugin, 'InteractionPlugin'],
    [LODPlugin, 'LODPlugin'],
    [AutoLayoutPlugin, 'AutoLayoutPlugin'],
    [AutoColorPlugin, 'AutoColorPlugin'],
    [MinimapPlugin, 'MinimapPlugin'],
    [ErgonomicsPlugin, 'ErgonomicsPlugin'],
    [PhysicsPlugin, 'PhysicsPlugin'],
    [HUDPlugin, 'HUDPlugin'],
    [HistoryPlugin, 'HistoryPlugin'],
];

export class SpaceGraph {
    public static instances: Set<SpaceGraph> = new Set();
    public container: HTMLElement;
    public renderer: Renderer;
    public graph: Graph;
    public pluginManager: PluginManager;
    public cameraControls: CameraControls;
    public events: EventManager;
    public vision: VisionManager;
    public poolManager: ObjectPoolManager<any>;
    public cullingManager: CullingManager;
    public optimizer: AdvancedRenderingOptimizer;
    public input: InputManager;
    public options: SpaceGraphOptions;
    private animationFrameId?: number;
    private lastTimestamp: number = 0;

    constructor(container: HTMLElement, options: SpaceGraphOptions = {}) {
        this.options = options;
        this.container = container;
        this.poolManager = new ObjectPoolManager();

        this.cullingManager = new CullingManager(this);
        this.optimizer = new AdvancedRenderingOptimizer(this);
        this.events = new EventManager(this);
        this.vision = new VisionManager(this);
        this.pluginManager = new PluginManager(this);
        this.renderer = new Renderer(this, container);
        this.graph = new Graph(this);
        this.cameraControls = new CameraControls(this);

        this.input = new InputManager({
            graph: this,
            events: this.events,
        });

        if ('input' in options) {
            const inputConfig = options.input as DefaultInputConfig | undefined;
            if (inputConfig && typeof inputConfig !== 'boolean') {
                applyDefaultInputConfig(this.input, this, inputConfig);
            }
        } else {
            applyDefaultInputConfig(this.input, this, {});
        }

        SpaceGraph.instances.add(this);
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
            logger.warn('WebGL not supported on this device. Rendering may fail or perform poorly.');
        }

        const graph = new SpaceGraph(element, options);
        await graph.init();
        graph.loadSpec(spec);
        graph.render();
        return graph;
    }

    async init() {
        this.renderer.init();

        NODE_TYPES.forEach((cls) => this.pluginManager.registerNodeType(cls.name, cls));
        EDGE_TYPES.forEach((cls) => this.pluginManager.registerEdgeType(cls.name, cls));
        LAYOUT_PLUGINS.forEach(([cls, name]) => this.pluginManager.register(name, new cls()));
        SYSTEM_PLUGINS.forEach(([cls, name]) => this.pluginManager.register(name, new cls()));

        await this.pluginManager.initAll();
    }

    loadSpec(spec: GraphSpec): void {
        spec.nodes?.forEach((nodeSpec) => this.graph.addNode(nodeSpec));
        spec.edges?.forEach((edgeSpec) => this.graph.addEdge(edgeSpec));
    }

    update(spec: SpecUpdate): void {
        spec.nodes?.forEach(
            (nodeUpdate) => nodeUpdate.id && this.graph.updateNode(nodeUpdate.id, nodeUpdate),
        );
        spec.edges?.forEach(
            (edgeUpdate) => edgeUpdate.id && this.graph.updateEdge(edgeUpdate.id, edgeUpdate),
        );
    }

    export(): GraphSpec & {
        camera?: { position: [number, number, number]; target: [number, number, number] };
        plugins?: Record<string, any>;
    } {
        const safeClone = (obj: any) => (obj ? JSON.parse(JSON.stringify(obj)) : {});

        const spec: any = {
            nodes: [...this.graph.nodes.values()].map((node) => ({
                id: node.id,
                type: node.constructor.name,
                label: node.label,
                position: [node.position.x, node.position.y, node.position.z],
                data: safeClone(node.data),
            })),
            edges: this.graph.edges.map((edge) => ({
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
        if (Object.keys(pluginState).length > 0) {
            spec.plugins = pluginState;
        }

        return spec;
    }

    import(data: any): void {
        this.graph.clear();
        this.loadSpec(data);

        if (data.camera && this.cameraControls && this.cameraControls.target) {
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

            // Recompute spherical based on new position/target
            const diff = MathPool.getInstance()
                .acquireVector3()
                .subVectors(this.renderer.camera.position, this.cameraControls.target);
            this.cameraControls.spherical.radius = diff.length();
            this.cameraControls.spherical.phi = Math.acos(
                diff.y / this.cameraControls.spherical.radius,
            );
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
        this.animationFrameId = requestAnimationFrame((t) => this.animate(t));

        this.optimizer.beginFrame(timestamp);

        // Calculate actual frame delta in seconds, capped at 0.1s to prevent huge jumps
        let delta = 0.016;
        if (this.lastTimestamp > 0 && timestamp > 0) {
            delta = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
        }
        this.lastTimestamp = timestamp;

        this.pluginManager.updateAll(delta);
        this.cameraControls.update();

        this.cullingManager.update();

        this.renderer.render();
    }

    render(): void {
        if (!this.animationFrameId) {
            this.animate();
        }
    }

    dispose(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = undefined;
        }

        // Dispose plugins and graphics resources
        this.pluginManager.disposePlugins();
        // Empty graph
        this.graph.clear();

        // Clean up DOM elements
        if (this.renderer) {
            if (
                this.renderer.renderer &&
                this.container.contains(this.renderer.renderer.domElement)
            ) {
                this.container.removeChild(this.renderer.renderer.domElement);
            }
            if (
                this.renderer.cssRenderer &&
                this.container.contains(this.renderer.cssRenderer.domElement)
            ) {
                this.container.removeChild(this.renderer.cssRenderer.domElement);
            }
        }

        // Clean up instance registry
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

    /**
     * Creates a new SpaceGraph instance, initializes it asynchronously, and imports the provided data state.
     */
    public static async import(
        container: string | HTMLElement,
        data: any,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        const element = SpaceGraph.getContainerElement(container);

        if (!element) {
            throw new Error(
                `[SpaceGraph] Import Error: Container not found for selector/element "${container}".`,
            );
        }

        const sg = new SpaceGraph(element, options);
        try {
            await sg.init();
            sg.import(data);
            sg.render();
        } catch (err) {
            logger.error('Import Runtime Error: Failed to import data or start rendering loop.', err);
        }
        return sg;
    }

    /**
     * Initializes a SpaceGraph instance and loads graph spec from a URL representing JSON.
     */
    public static async fromURL(
        url: string,
        container: HTMLElement,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        if (!url || typeof url !== 'string') {
            throw new Error(`[SpaceGraph] fromURL Error: Invalid URL "${url}".`);
        }
        if (!container) {
            throw new Error(`[SpaceGraph] fromURL Error: Container element is undefined or null.`);
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
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const wrappedError = new Error(
                `[SpaceGraph] fromURL Error: Failed to load graph from ${url}. Reason: ${message}`,
            );
            (wrappedError as any).cause = error;
            logger.error('fromURL Error: Failed to load graph.', wrappedError);
            throw wrappedError;
        }
        return sg;
    }
}
