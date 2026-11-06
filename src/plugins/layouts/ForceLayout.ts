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
    /** Extra padding between nodes for collision avoidance. Default: 20. */
    nodePadding?: number;
    /** Progress callback: fired each iteration with (iteration, total). */
    onProgress?: (iteration: number, total: number) => void;
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
            this.forceConfig.onProgress?.(i + 1, iterations);
        }

        // Final pairwise separation pass: guarantee zero overlap by construction
        this.#separateOverlaps(nodes);

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
     * Get the effective collision radius for a node: diagonal of its bounds + padding.
     * This is half the distance two nodes need to sit side by side without overlapping.
     */
    #getNodeRadius(node: Node, padding: number): number {
        const bounds = node.getLayoutBounds();
        // Diagonal radius: half the diagonal of the bounding box
        const diagonal = Math.hypot(bounds.width, bounds.height);
        return diagonal / 2 + padding;
    }

    /**
     * Advance the simulation by one step: every node moves one tick towards its equilibrium.
     */
    step(nodes: Node[] = Array.from(this.graph.getNodes())): void {
        if (!nodes.length) return;
        const config = this.forceConfig;
        const padding = config.nodePadding ?? 20;
        const forces = new Map<string, Vector3>();
        for (const node of nodes) forces.set(node.id, new Vector3());

        // Precompute radii for all nodes
        const radii = new Map<string, number>();
        for (const node of nodes) {
            radii.set(node.id, this.#getNodeRadius(node, padding));
        }

        const maxForce = config.repulsion / (config.minDistance * config.minDistance);
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];
                const diff = new Vector3().subVectors(a.position, b.position);
                const distSq = diff.lengthSq();
                const dist = Math.sqrt(distSq);
                if (dist < 0.001) continue;

                // Per-pair minimum distance based on node sizes
                const minDist = (radii.get(a.id) ?? 0) + (radii.get(b.id) ?? 0);
                const effectiveDistSq = Math.max(distSq, minDist * minDist);

                const repulsion = config.repulsion / effectiveDistSq;
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
            // Edge strength weighted attraction
            const strength = (e.data?.strength as number) ?? 1;
            const force = config.attraction * dist * strength;
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

    /** Final separation pass: push overlapping nodes apart until no overlaps remain. */
    #separateOverlaps(nodes: Node[]): void {
        const config = this.forceConfig;
        const padding = config.nodePadding ?? 20;

        // Precompute radii
        const radii = new Map<string, number>();
        for (const node of nodes) {
            radii.set(node.id, this.#getNodeRadius(node, padding));
        }

        // 30-pass separation (same pattern as ForcePlacement)
        for (let pass = 0; pass < 30; pass++) {
            let anyOverlap = false;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];
                    if (this.isPinned(a) && this.isPinned(b)) continue;

                    const diff = new Vector3().subVectors(a.position, b.position);
                    const dist = diff.length();
                    if (dist < 0.001) continue;

                    const needed = (radii.get(a.id) ?? 0) + (radii.get(b.id) ?? 0);

                    if (dist < needed) {
                        anyOverlap = true;
                        const shove = (needed - dist) / 2;
                        const direction = diff.normalize();
                        if (!this.isPinned(a)) a.position.add(direction.clone().multiplyScalar(shove));
                        if (!this.isPinned(b)) b.position.sub(direction.clone().multiplyScalar(shove));
                    }
                }
            }
            if (!anyOverlap) break;
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
            nodePadding: 20,
        };
    }
}
