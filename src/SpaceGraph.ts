import * as THREE from 'three';
import { Graph } from './core/Graph';
import { Renderer } from './core/Renderer';
import { PluginManager } from './core/PluginManager';
import { CameraControls } from './core/CameraControls';
import { EventManager } from './core/EventManager';
import { VisionManager } from './core/VisionManager';
import { UnifiedDisposalSystem } from './core/UnifiedDisposalSystem';
import { ObjectPoolManager } from './core/ObjectPoolManager';
import { CullingManager } from './core/CullingManager';
import { AdvancedRenderingOptimizer } from './core/AdvancedRenderingOptimizer';
import { ShapeNode } from './nodes/ShapeNode';
import { HtmlNode } from './nodes/HtmlNode';
import { ImageNode } from './nodes/ImageNode';
import { GroupNode } from './nodes/GroupNode';
import { Edge } from './edges/Edge';
import { CurvedEdge } from './edges/CurvedEdge';
import { FlowEdge } from './edges/FlowEdge';
import { ForceLayout } from './plugins/ForceLayout';
import { InteractionPlugin } from './plugins/InteractionPlugin';
import { LODPlugin } from './plugins/LODPlugin';
import { AutoLayoutPlugin } from './plugins/AutoLayoutPlugin';
import { AutoColorPlugin } from './plugins/AutoColorPlugin';
import type { GraphSpec, SpaceGraphOptions, SpecUpdate } from './types';

export class SpaceGraph {
  public container: HTMLElement;
  public renderer: Renderer;
  public graph: Graph;
  public pluginManager: PluginManager;
  public cameraControls: CameraControls;
  public events: EventManager;
  public vision: VisionManager;
  public disposalSystem: UnifiedDisposalSystem;
  public poolManager: ObjectPoolManager<any>;
  public cullingManager: CullingManager;
  public optimizer: AdvancedRenderingOptimizer;

  constructor(container: HTMLElement, options: SpaceGraphOptions = {}) {
    this.container = container;
    this.disposalSystem = new UnifiedDisposalSystem();
    this.poolManager = new ObjectPoolManager<any>();
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
    const element = typeof container === 'string'
      ? document.querySelector(container) as HTMLElement
      : container;

    if (!element) {
      throw new Error(
        `Container not found: "${container}".\n` +
        `Make sure the element exists in the DOM.`
      );
    }

    if (!SpaceGraph.checkWebGL()) {
      console.warn('WebGL not supported. Some features may not work.');
    }

    const graph = new SpaceGraph(element);
    graph.init().then(() => {
      graph.loadSpec(spec);
    });
    return graph;
  }

  async init() {
    this.renderer.init();

    // Register built-in types
    this.pluginManager.registerNodeType('ShapeNode', ShapeNode);
    this.pluginManager.registerNodeType('HtmlNode', HtmlNode);
    this.pluginManager.registerNodeType('ImageNode', ImageNode);
    this.pluginManager.registerNodeType('GroupNode', GroupNode);
    this.pluginManager.registerEdgeType('Edge', Edge);
    this.pluginManager.registerEdgeType('CurvedEdge', CurvedEdge);
    this.pluginManager.registerEdgeType('FlowEdge', FlowEdge);

    // Register built-in plugins
    const forceLayout = new ForceLayout();
    this.pluginManager.register('ForceLayout', forceLayout);
    const interaction = new InteractionPlugin();
    this.pluginManager.register('InteractionPlugin', interaction);
    const lod = new LODPlugin();
    this.pluginManager.register('LODPlugin', lod);
    const autoLayout = new AutoLayoutPlugin();
    this.pluginManager.register('AutoLayoutPlugin', autoLayout);
    const autoColor = new AutoColorPlugin();
    this.pluginManager.register('AutoColorPlugin', autoColor);

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

  fitView(padding: number = 100, duration: number = 1.5): void {
      const nodes = Array.from(this.graph.nodes.values());
      if (nodes.length === 0) return;

      const box = new THREE.Box3();
      nodes.forEach(node => {
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
    requestAnimationFrame((t) => this.animate(t));

    this.optimizer.beginFrame(timestamp);

    const delta = 0.016; // rough estimate for 60fps
    this.pluginManager.updateAll(delta);
    this.cameraControls.update();

    this.cullingManager.update();

    this.renderer.render();
  }

  render(): void {
    this.animate();
  }

  private static checkWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
      return false;
    }
  }
}
