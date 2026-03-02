import * as THREE from 'three';
import { Graph } from './core/Graph';
import { Renderer } from './core/Renderer';
import { PluginManager } from './core/PluginManager';
import { CameraControls } from './core/CameraControls';
import { EventManager } from './core/EventManager';
import { VisionManager } from './core/VisionManager';
import { ShapeNode } from './nodes/ShapeNode';
import { HtmlNode } from './nodes/HtmlNode';
import { Edge } from './edges/Edge';
import { CurvedEdge } from './edges/CurvedEdge';
import { ForceLayout } from './plugins/ForceLayout';
import { InteractionPlugin } from './plugins/InteractionPlugin';
import { LODPlugin } from './plugins/LODPlugin';
import type { GraphSpec, SpaceGraphOptions, SpecUpdate } from './types';

export class SpaceGraph {
  public container: HTMLElement;
  public renderer: Renderer;
  public graph: Graph;
  public pluginManager: PluginManager;
  public cameraControls: CameraControls;
  public events: EventManager;
  public vision: VisionManager;

  constructor(container: HTMLElement, options: SpaceGraphOptions = {}) {
    this.container = container;
    this.events = new EventManager(this);
    this.vision = new VisionManager(this);
    this.pluginManager = new PluginManager(this);
    this.renderer = new Renderer(this, container);
    this.graph = new Graph(this);
    this.cameraControls = new CameraControls(this);
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
    this.pluginManager.registerEdgeType('Edge', Edge);
    this.pluginManager.registerEdgeType('CurvedEdge', CurvedEdge);

    // Register built-in plugins
    const layout = new ForceLayout();
    this.pluginManager.register('LayoutPlugin', layout);
    const interaction = new InteractionPlugin();
    this.pluginManager.register('InteractionPlugin', interaction);
    const lod = new LODPlugin();
    this.pluginManager.register('LODPlugin', lod);

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

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = 0.016; // rough estimate for 60fps
    this.pluginManager.updateAll(delta);
    this.cameraControls.update();

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
