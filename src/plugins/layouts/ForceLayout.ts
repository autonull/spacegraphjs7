import { Vector3 } from 'three';
import type { Edge } from '../../edges/Edge';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutConfig } from './BaseLayout';

export interface ForceLayoutConfig extends LayoutConfig {
    repulsion: number;
    attraction: number;
    damping: number;
    gravity: number;
    minDistance: number;
    maxDistance: number;
    iterations: number;
    temperature: number;
    /** Target node spacing. Used to scale initial temperature. Default: 120. */
    spacing?: number;
    /** If true, nodes start from random positions instead of current positions. Default: false. */
    randomize?: boolean;
    /** Random seed for deterministic randomization. Default: 42. */
    seed?: number;
}

/**
 * Force-directed layout using spring-electrical model.
 * Simulates physical forces (repulsion between nodes, attraction along edges)
 * to produce aesthetically pleasing layouts with minimal edge crossings.
 */
export class ForceLayout extends BaseLayout<ForceLayoutConfig> {
    readonly id = 'force-layout';
    readonly name = 'Force Directed';
    readonly version = '1.0.0';

    private velocities = new Map<string, Vector3>();
    private currentIteration = 0;

    private get forceConfig(): ForceLayoutConfig {
        return this.config as ForceLayoutConfig;
    }

    private get effectiveTemperature(): number {
        const config = this.forceConfig;
        // If spacing is provided, scale temperature to achieve approximate target spacing
        if (config.spacing !== undefined) {
            return config.spacing;
        }
        return config.temperature;
    }

    private get simulationProgress(): number {
        const total = this.forceConfig.iterations;
        return total > 0 ? this.currentIteration / total : 0;
    }

    /** The simulation owns every node: it reads the pinned ones but never moves them. */
    protected override readonly ownsEveryNode = true;

    /**
     * Reset the layout's internal state. Call this before re-running layout on the same nodes
     * to ensure a fresh simulation from current positions.
     */
    reset(): void {
        this.velocities.clear();
        this.currentIteration = 0;
    }

    protected place(nodes: Node[], _config: ForceLayoutConfig): void {
        // Always reset velocities for a fresh simulation
        this.velocities.clear();
        this.currentIteration = 0;

        // Optionally randomize positions first
        if (this.forceConfig.randomize) {
            const seed = this.forceConfig.seed ?? 42;
            let random = this.#mulberry32(seed);
            for (const node of nodes) {
                if (!this.isPinned(node)) {
                    node.position.set(
                        (random() - 0.5) * 400,
                        (random() - 0.5) * 400,
                        (random() - 0.5) * 400,
                    );
                    node.object.position.copy(node.position);
                }
            }
        }

        for (const node of nodes) this.velocities.set(node.id, new Vector3());

        const { iterations } = this.forceConfig;
        for (let i = 0; i < iterations; i++) {
            this.currentIteration = i + 1;
            this.step(nodes);
        }

        for (const node of nodes) {
            if (this.isPinned(node)) continue;
            this.syncPosition(node);
        }
    }

    #mulberry32(seed: number): () => number {
        let t = seed >>> 0;
        return () => {
            t += 0x6d2b79f5;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    }

    /**
     * Advance the simulation by one step: every node moves one tick towards its equilibrium.
     */
    step(nodes: Node[] = Array.from(this.graph.getNodes())): void {
        if (!nodes.length) return;
        const config = this.forceConfig;
        const forces = new Map<string, Vector3>();
        for (const node of nodes) forces.set(node.id, new Vector3());

        const maxForce = config.repulsion / (config.minDistance * config.minDistance);
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];
                const diff = new Vector3().subVectors(a.position, b.position);
                const distSq = diff.lengthSq();
                const dist = Math.sqrt(distSq);
                if (dist < 0.001) continue;
                const repulsion = config.repulsion / distSq;
                const force = Math.min(repulsion, maxForce);
                const direction = diff.normalize();
                forces.get(a.id)!.add(direction.clone().multiplyScalar(force));
                forces.get(b.id)!.sub(direction.clone().multiplyScalar(force));
            }
        }

        for (const edge of this.graph.getEdges()) {
            const e = edge as Edge;
            const source = this.graph.getNode(e.source.id);
            const target = this.graph.getNode(e.target.id);
            if (!source || !target) continue;
            const diff = new Vector3().subVectors(target.position, source.position);
            const dist = diff.length();
            const force = config.attraction * dist;
            const direction = diff.normalize();
            forces.get(source.id)!.add(direction.clone().multiplyScalar(force));
            forces.get(target.id)!.sub(direction.clone().multiplyScalar(force));
        }

        for (const node of nodes) {
            const force = forces.get(node.id)!;
            const dist = node.position.length();
            if (dist > 0)
                force.add(
                    node.position
                        .clone()
                        .normalize()
                        .negate()
                        .multiplyScalar(config.gravity * dist),
                );
        }

        for (const node of nodes) {
            if (this.isPinned(node)) continue;
            const velocity = this.velocities.get(node.id)!;
            velocity.add(forces.get(node.id)!).multiplyScalar(config.damping);
            const maxMove = this.effectiveTemperature * (1 - this.simulationProgress);
            if (velocity.length() > maxMove) velocity.setLength(maxMove);
            node.position.add(velocity);
        }
    }

    override dispose(): void {
        super.dispose();
        this.velocities.clear();
    }

    protected defaultConfig(): ForceLayoutConfig {
        return {
            repulsion: 10000,
            attraction: 0.01,
            damping: 0.9,
            gravity: 0.1,
            minDistance: 50,
            maxDistance: 1000,
            iterations: 50,
            temperature: 100,
            spacing: 120,
            animate: true,
            duration: 1.0,
        };
    }
}
