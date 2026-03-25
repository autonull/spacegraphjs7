// SpaceGraphJS v7.0 - Force Layout Plugin
// Force-directed graph layout using velocity Verlet integration

import * as THREE from 'three';
import { BaseLayout } from '../core/plugins/BaseLayout';
import type { LayoutOptions } from '../core/plugins/PluginRegistry';

/**
 * Force layout configuration
 */
export interface ForceLayoutConfig {
  repulsion: number;
  attraction: number;
  damping: number;
  gravity: number;
  minDistance: number;
  maxDistance: number;
  iterations: number;
  temperature: number;
}

/**
 * Force Layout
 * Implements force-directed layout with velocity Verlet integration
 */
export class ForceLayout extends BaseLayout {
  readonly id = 'force-layout';
  readonly name = 'Force Directed';

  private config: ForceLayoutConfig;
  private velocities: Map<string, THREE.Vector3> = new Map();

  defaultConfig(): ForceLayoutConfig {
    return {
      repulsion: 10000,
      attraction: 0.01,
      damping: 0.9,
      gravity: 0.1,
      minDistance: 50,
      maxDistance: 1000,
      iterations: 50,
      temperature: 100
    };
  }

  override init(context: import('./PluginRegistry').PluginContext): void {
    super.init(context);
    this.config = { ...this.defaultConfig(), ...context.config };
  }

  /**
   * Apply force-directed layout
   */
  async apply(options?: LayoutOptions): Promise<void> {
    const {
      animate = this.config.animate ?? true,
      duration = this.config.duration ?? 1.0
    } = options ?? {};

    const nodes = Array.from(this.graph.getNodes());
    if (nodes.length === 0) return;

    // Initialize velocities
    this.velocities.clear();
    for (const node of nodes) {
      this.velocities.set(node.id, new THREE.Vector3());
    }

    // Run simulation iterations
    for (let i = 0; i < this.config.iterations; i++) {
      this.simulateStep(nodes);
    }

    // Apply final positions
    for (const node of nodes) {
      if ((node.data as any).pinned) continue;

      const target = node.position.clone();
      this.applyPosition(node, target, { animate, duration });
    }

    // Emit layout applied event
    this.events.emit('layout:applied', {
      layout: this.id,
      duration,
      timestamp: Date.now()
    });
  }

  /**
   * Simulate one step of force-directed layout
   */
  private simulateStep(nodes: Array<{ id: string; position: THREE.Vector3 }>): void {
    const forces = new Map<string, THREE.Vector3>();

    // Initialize forces
    for (const node of nodes) {
      forces.set(node.id, new THREE.Vector3());
    }

    // Apply repulsion (node-node)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];

        const diff = new THREE.Vector3()
          .subVectors(a.position, b.position);
        const distSq = diff.lengthSq();
        const dist = Math.sqrt(distSq);

        if (dist < 0.1) continue;

        // Coulomb's law: F = k / r^2
        const force = this.config.repulsion / distSq;
        const direction = diff.normalize();

        const forceA = forces.get(a.id)!;
        const forceB = forces.get(b.id)!;

        forceA.add(direction.clone().multiplyScalar(force));
        forceB.sub(direction.clone().multiplyScalar(force));
      }
    }

    // Apply attraction (along edges)
    for (const edge of this.graph.getEdges()) {
      const source = this.graph.getNode(edge.source.id);
      const target = this.graph.getNode(edge.target.id);

      if (!source || !target) continue;

      const diff = new THREE.Vector3()
        .subVectors(target.position, source.position);
      const dist = diff.length();

      if (dist < this.config.minDistance) continue;

      // Hooke's law: F = -k * x
      const force = this.config.attraction * (dist - this.config.minDistance);
      const direction = diff.normalize();

      const sourceForce = forces.get(source.id)!;
      const targetForce = forces.get(target.id)!;

      sourceForce.add(direction.clone().multiplyScalar(force));
      targetForce.sub(direction.clone().multiplyScalar(force));
    }

    // Apply gravity (toward center)
    for (const node of nodes) {
      const force = forces.get(node.id)!;
      const dist = node.position.length();

      if (dist > 0) {
        const gravityForce = this.config.gravity * dist;
        const direction = node.position.clone().normalize().negate();
        force.add(direction.multiplyScalar(gravityForce));
      }
    }

    // Update positions using velocity Verlet
    for (const node of nodes) {
      if ((node.data as any).pinned) continue;

      const force = forces.get(node.id)!;
      const velocity = this.velocities.get(node.id)!;

      // Update velocity
      velocity.add(force);
      velocity.multiplyScalar(this.config.damping);

      // Update position
      node.position.add(velocity);

      // Cool down temperature
      const maxMove = this.config.temperature * (1 - this.simulationProgress);
      if (node.position.length() > maxMove) {
        node.position.clampLength(0, maxMove);
      }
    }
  }

  private get simulationProgress(): number {
    // Simplified - would track actual progress in real implementation
    return 0.5;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.velocities.forEach(v => v.set(0, 0, 0));
    this.velocities.clear();
  }
}
