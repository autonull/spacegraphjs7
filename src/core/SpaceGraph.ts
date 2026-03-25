// SpaceGraphJS v7.0 - SpaceGraph Class
// Main SpaceGraph implementation

import * as THREE from 'three';
import type { Graph } from '../../graph/Graph';
import type { NodeSpec, EdgeSpec, GraphSpec, GraphExport } from '../../graph/types';
import type { EventSystem } from '../events/EventSystem';
import type { PluginRegistry } from '../plugins/PluginRegistry';
import type { RenderingSystem } from '../renderer/RenderingSystem';
import type { VisionSystem } from '../../vision/VisionSystem';

/**
 * SpaceGraph options
 */
export interface SpaceGraphOptions {
  vision?: {
    strategy?: 'heuristics' | 'onnx' | 'hybrid';
    heuristics?: {
      wcagThreshold?: number;
      overlapPadding?: number;
      fittsLawTargetSize?: number;
    };
  };
  rendering?: {
    antialias?: boolean;
    backgroundColor?: string | number;
  };
  [key: string]: unknown;
}

/**
 * SpaceGraph v7
 * Main class for managing graph visualization
 */
export class SpaceGraph {
  // Public state (read-only)
  readonly graph: Graph;
  readonly events: EventSystem;
  readonly vision: VisionSystem;
  readonly plugins: PluginRegistry;
  readonly renderer: RenderingSystem;
  readonly options: Readonly<SpaceGraphOptions>;

  // Private state
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private disposed = false;

  constructor(
    container: HTMLElement,
    graph: Graph,
    events: EventSystem,
    vision: VisionSystem,
    plugins: PluginRegistry,
    renderer: RenderingSystem,
    options: SpaceGraphOptions
  ) {
    this.graph = graph;
    this.events = events;
    this.vision = vision;
    this.plugins = plugins;
    this.renderer = renderer;
    this.options = Object.freeze({ ...options });

    // Start render loop
    this.startRenderLoop();
  }

  /**
   * Start the render loop
   */
  private startRenderLoop(): void {
    const animate = (timestamp: number) => {
      if (this.disposed) return;

      this.animationFrameId = requestAnimationFrame(animate);

      // Calculate delta
      let delta = 0.016;
      if (this.lastTimestamp > 0 && timestamp > 0) {
        delta = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
      }
      this.lastTimestamp = timestamp;

      // Update plugins
      this.plugins.updatePreFrame(delta);

      // Sync edge positions
      this.syncEdges();

      // Render
      this.renderer.render();

      // Post-frame hooks
      this.plugins.updatePostFrame(delta);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Sync edge positions with their connected nodes
   */
  private syncEdges(): void {
    // This would iterate over edges and update their positions
    // Implementation depends on how edges are stored
  }

  /**
   * Fit view to show all nodes
   */
  fitView(padding: number = 100, duration: number = 1.5): void {
    const nodes = Array.from(this.graph.getNodes());
    if (nodes.length === 0) return;

    // Calculate bounds
    const box = new THREE.Box3();
    for (const node of nodes) {
      box.expandByPoint(node.position);
    }

    // Get center
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Calculate camera position
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.renderer.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
    cameraZ *= 1.5; // Extra padding

    // Fly to position (would use GSAP in full implementation)
    this.renderer.camera.position.set(center.x, center.y, cameraZ + padding);
    this.renderer.camera.lookAt(center);
  }

  /**
   * Export graph as PNG
   */
  async exportPNG(scale: number = 1): Promise<Blob> {
    return this.renderer.exportPNG(scale);
  }

  /**
   * Export graph to JSON
   */
  export(): GraphExport {
    return this.graph.export();
  }

  /**
   * Import graph from JSON
   */
  import(data: GraphExport): void {
    // Clear existing
    this.graph.clear();

    // Would need node/edge factories to recreate
    // This is a simplified version
    console.warn('[SpaceGraph] import() requires node/edge factories - not fully implemented');
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // Stop render loop
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Dispose plugins
    this.plugins.dispose();

    // Dispose graph
    this.graph.clear();

    // Dispose renderer
    this.renderer.dispose();
  }

  /**
   * Convert to shareable URL
   * This would encode the graph state into a URL fragment
   */
  toShareURL(): string {
    const data = this.export();
    const json = JSON.stringify(data);
    const encoded = btoa(encodeURIComponent(json));
    return `${window.location.origin}${window.location.pathname}#${encoded}`;
  }
}
