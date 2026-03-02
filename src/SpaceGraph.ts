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
import { ForceLayout } from './plugins/ForceLayout';
import { InteractionPlugin } from './plugins/InteractionPlugin';
import type { GraphSpec, SpaceGraphOptions } from './types';

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
      throw new Error(`Container not found: ${container}`);
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

    // Register built-in plugins
    const layout = new ForceLayout();
    this.pluginManager.register('LayoutPlugin', layout);
    const interaction = new InteractionPlugin();
    this.pluginManager.register('InteractionPlugin', interaction);

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

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = 0.016; // rough estimate for 60fps
    this.pluginManager.updateAll(delta);

    this.renderer.render();
  }

  render(): void {
    this.animate();
  }
}
