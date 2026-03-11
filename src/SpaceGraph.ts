import * as THREE from 'three';
import { Graph } from './core/Graph';
import { Renderer } from './core/Renderer';
import { PluginManager } from './core/PluginManager';
import { CameraControls } from './core/CameraControls';
import { EventManager } from './core/EventManager';
import { VisionManager } from './core/VisionManager';
import { ObjectPoolManager } from './core/ObjectPoolManager';
import { CullingManager } from './core/CullingManager';
import { AdvancedRenderingOptimizer } from './core/AdvancedRenderingOptimizer';
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
import type { GraphSpec, SpaceGraphOptions, SpecUpdate } from './types';

export class SpaceGraph {
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
    private animationFrameId?: number;
    private lastTimestamp: number = 0;

    constructor(container: HTMLElement, _options: SpaceGraphOptions = {}) {
        this.container = container;
        // Object Pool
        this.poolManager = new ObjectPoolManager();

        // Advanced Rendering Optimizer & Culling
        this.cullingManager = new CullingManager(this);
        this.optimizer = new AdvancedRenderingOptimizer(this);
        this.events = new EventManager(this);
        this.vision = new VisionManager(this);
        this.pluginManager = new PluginManager(this);
        this.renderer = new Renderer(this, container);
        this.graph = new Graph(this);
        this.cameraControls = new CameraControls(this);

        // Register instance for global analysis
        if (typeof window !== 'undefined') {
            const w = window as any;
            if (!w.__SPACEGRAPH_INSTANCES__) {
                w.__SPACEGRAPH_INSTANCES__ = [];
            }
            w.__SPACEGRAPH_INSTANCES__.push(this);
        }
    }

    static create(container: string | HTMLElement, spec: GraphSpec): SpaceGraph {
        const element =
            typeof container === 'string'
                ? (document.querySelector(container) as HTMLElement)
                : container;

        if (!element) {
            throw new Error(
                `[SpaceGraph] Initialization Error: Container not found for selector/element "${container}". ` +
                `Make sure the element exists in the DOM before calling create().`
            );
        }

        if (!SpaceGraph.checkWebGL()) {
            console.warn('[SpaceGraph] Warning: WebGL not supported on this device. Rendering may fail or perform poorly.');
        }

        const graph = new SpaceGraph(element);
        graph.init()
            .then(() => {
                try {
                    graph.loadSpec(spec);
                    graph.render();
                } catch (err) {
                    console.error('[SpaceGraph] Runtime Error: Failed to load spec or start rendering loop.', err);
                }
            })
            .catch((err) => {
                console.error('[SpaceGraph] Initialization Error: Core systems failed to initialize.', err);
            });

        return graph;
    }

    async init() {
        this.renderer.init();

        // Register built-in node types
        this.pluginManager.registerNodeType('ShapeNode', ShapeNode);
        this.pluginManager.registerNodeType('InstancedShapeNode', InstancedShapeNode);
        this.pluginManager.registerNodeType('HtmlNode', HtmlNode);
        this.pluginManager.registerNodeType('ImageNode', ImageNode);
        this.pluginManager.registerNodeType('GroupNode', GroupNode);
        this.pluginManager.registerNodeType('NoteNode', NoteNode);
        this.pluginManager.registerNodeType('DataNode', DataNode);
        this.pluginManager.registerNodeType('CanvasNode', CanvasNode);
        this.pluginManager.registerNodeType('TextMeshNode', TextMeshNode);
        this.pluginManager.registerNodeType('VideoNode', VideoNode);
        this.pluginManager.registerNodeType('IFrameNode', IFrameNode);
        this.pluginManager.registerNodeType('ChartNode', ChartNode);
        this.pluginManager.registerNodeType('MarkdownNode', MarkdownNode);
        this.pluginManager.registerNodeType('GlobeNode', GlobeNode);
        this.pluginManager.registerNodeType('SceneNode', SceneNode);
        this.pluginManager.registerNodeType('AudioNode', AudioNode);
        this.pluginManager.registerNodeType('MathNode', MathNode);
        this.pluginManager.registerNodeType('ProcessNode', ProcessNode);

        // Register built-in edge types
        this.pluginManager.registerEdgeType('Edge', Edge);
        this.pluginManager.registerEdgeType('CurvedEdge', CurvedEdge);
        this.pluginManager.registerEdgeType('FlowEdge', FlowEdge);
        this.pluginManager.registerEdgeType('LabeledEdge', LabeledEdge);
        this.pluginManager.registerEdgeType('DottedEdge', DottedEdge);
        this.pluginManager.registerEdgeType('DynamicThicknessEdge', DynamicThicknessEdge);
        this.pluginManager.registerEdgeType('AnimatedEdge', AnimatedEdge);
        this.pluginManager.registerEdgeType('BundledEdge', BundledEdge);
        this.pluginManager.registerEdgeType('InterGraphEdge', InterGraphEdge);

        // Register built-in plugins (Layouts)
        this.pluginManager.register('ForceLayout', new ForceLayout());
        this.pluginManager.register('CircularLayout', new CircularLayout());
        this.pluginManager.register('GridLayout', new GridLayout());
        this.pluginManager.register('HierarchicalLayout', new HierarchicalLayout());
        this.pluginManager.register('RadialLayout', new RadialLayout());
        this.pluginManager.register('TreeLayout', new TreeLayout());
        this.pluginManager.register('SpectralLayout', new SpectralLayout());
        this.pluginManager.register('GeoLayout', new GeoLayout());
        this.pluginManager.register('MapLayout', new GeoLayout()); // Alias
        this.pluginManager.register('TimelineLayout', new TimelineLayout());
        this.pluginManager.register('ClusterLayout', new ClusterLayout());

        // Register built-in plugins (Systems)
        this.pluginManager.register('InteractionPlugin', new InteractionPlugin());
        this.pluginManager.register('LODPlugin', new LODPlugin());
        this.pluginManager.register('AutoLayoutPlugin', new AutoLayoutPlugin());
        this.pluginManager.register('AutoColorPlugin', new AutoColorPlugin());
        this.pluginManager.register('MinimapPlugin', new MinimapPlugin());
        this.pluginManager.register('ErgonomicsPlugin', new ErgonomicsPlugin());
        this.pluginManager.register('PhysicsPlugin', new PhysicsPlugin());
        this.pluginManager.register('HUDPlugin', new HUDPlugin());

        await this.pluginManager.initAll();
    }

    loadSpec(spec: GraphSpec): void {
        if (spec.nodes && spec.nodes.length > 0) {
            for (const nodeSpec of spec.nodes) {
                this.graph.addNode(nodeSpec);
            }
        }

        if (spec.edges && spec.edges.length > 0) {
            for (const edgeSpec of spec.edges) {
                this.graph.addEdge(edgeSpec);
            }
        }
    }

    update(spec: SpecUpdate): void {
        if (spec.nodes) {
            for (const nodeUpdate of spec.nodes) {
                if (nodeUpdate.id) {
                    this.graph.updateNode(nodeUpdate.id, nodeUpdate);
                }
            }
        }

        if (spec.edges) {
            for (const edgeUpdate of spec.edges) {
                if (edgeUpdate.id) {
                    this.graph.updateEdge(edgeUpdate.id, edgeUpdate);
                }
            }
        }
    }

    export(): GraphSpec & { camera?: { position: [number, number, number], target: [number, number, number] }, plugins?: Record<string, any> } {
        const spec: any = {
            nodes: [],
            edges: []
        };

        for (const node of this.graph.nodes.values()) {
            spec.nodes.push({
                id: node.id,
                type: node.constructor.name,
                label: node.label,
                position: [node.position.x, node.position.y, node.position.z],
                data: JSON.parse(JSON.stringify(node.data || {}))
            });
        }

        for (const edge of this.graph.edges) {
            spec.edges.push({
                id: edge.id,
                type: edge.constructor.name,
                source: edge.source.id,
                target: edge.target.id,
                data: JSON.parse(JSON.stringify(edge.data || {}))
            });
        }

        if (this.cameraControls && this.cameraControls.target) {
            spec.camera = {
                position: [
                    this.renderer.camera.position.x,
                    this.renderer.camera.position.y,
                    this.renderer.camera.position.z
                ],
                target: [
                    this.cameraControls.target.x,
                    this.cameraControls.target.y,
                    this.cameraControls.target.z
                ]
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
                data.camera.position[2]
            );
            this.cameraControls.target.set(
                data.camera.target[0],
                data.camera.target[1],
                data.camera.target[2]
            );

            // Recompute spherical based on new position/target
            const diff = new THREE.Vector3().subVectors(this.renderer.camera.position, this.cameraControls.target);
            this.cameraControls.spherical.radius = diff.length();
            this.cameraControls.spherical.phi = Math.acos(diff.y / this.cameraControls.spherical.radius);
            this.cameraControls.spherical.theta = Math.atan2(diff.x, diff.z);

            this.cameraControls.update();
        }

        if (data.plugins) {
            this.pluginManager.import(data.plugins);
        }
    }

    fitView(padding: number = 100, duration: number = 1.5): void {
        const nodes = Array.from(this.graph.nodes.values());
        if (nodes.length === 0) return;

        const box = new THREE.Box3();
        nodes.forEach((node) => {
            box.expandByPoint(node.position);
        });

        const center = new THREE.Vector3();
        box.getCenter(center);

        const size = new THREE.Vector3();
        box.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.renderer.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

        // Add padding and a minimum distance
        cameraZ += padding;
        cameraZ = Math.max(cameraZ, 200); // Minimum distance

        this.cameraControls.flyTo(center, cameraZ, duration);
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

        // Clean up instances array
        if (typeof window !== 'undefined') {
            const w = window as any;
            if (w.__SPACEGRAPH_INSTANCES__) {
                w.__SPACEGRAPH_INSTANCES__ = w.__SPACEGRAPH_INSTANCES__.filter(
                    (inst: any) => inst !== this,
                );
            }
        }
    }

    private static checkWebGL(): boolean {
        try {
            const canvas = document.createElement('canvas');
            return !!(
                window.WebGLRenderingContext &&
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
            );
        } catch {
            return false;
        }
    }

    /**
     * Initializes a SpaceGraph instance and loads graph spec from a URL representing JSON.
     */
    public static async fromURL(
        url: string,
        container: HTMLElement,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        const sg = new SpaceGraph(container, options);
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch graph from ${url}`);
            const spec: GraphSpec = await response.json();
            sg.graph.fromJSON(spec);
        } catch (error) {
            console.error('[SpaceGraphJS] fromURL failed:', error);
            throw error;
        }
        return sg;
    }
}
