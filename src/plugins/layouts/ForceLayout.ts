import { Vector3 } from 'three';
import { ForceCore, type ForceCoreConfig } from '../../layout/force-core';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutConfig } from './BaseLayout';

export interface ForceLayoutConfig extends LayoutConfig {
    /** Repulsion strength between nodes. Default: 10000. */
    repulsion: number;
    /** Attraction strength along edges. Default: 0.01. */
    attraction: number;
    /** Velocity damping factor. Default: 0.9. */
    damping: number;
    /** Gravity towards center. Default: 0.1. */
    gravity: number;
    /** Minimum distance for force calculation. Default: 50. */
    minDistance: number;
    /** Maximum distance for force application. Default: 1000. */
    maxDistance: number;
    /** Number of simulation iterations. Default: 50. */
    iterations: number;
    /** Initial temperature for cooling schedule. Default: 100. */
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
 * 
 * Now uses shared ForceCore for the simulation logic, ensuring consistency
 * with ForcePlacement and eliminating drift between engines.
 */
export class ForceLayout extends BaseLayout<ForceLayoutConfig> {
    readonly id = 'force-layout';
    readonly name = 'Force Directed';
    readonly version = '1.0.0';

    #core: ForceCore;
    #velocities = new Map<string, Vector3>();
    #currentIteration = 0;

    constructor(config: Partial<ForceLayoutConfig> = {}) {
        super(config);
        this.#core = new ForceCore({
            spacing: config.spacing ?? 120,
            iterations: config.iterations ?? 50,
            seed: config.seed ?? 42,
            depthStep: 64,
            nodePadding: config.nodePadding ?? 20,
            attraction: config.attraction ?? 0.01,
            repulsion: config.repulsion ?? 10000,
            damping: config.damping ?? 0.9,
            gravity: config.gravity ?? 0.1,
            minDistance: config.minDistance ?? 50,
            maxDistance: config.maxDistance ?? 1000,
            temperature: config.temperature ?? 100,
            randomize: config.randomize ?? false,
            onProgress: config.onProgress,
        });
    }

    private get forceConfig(): ForceLayoutConfig {
        return this.config as ForceLayoutConfig;
    }

    /** The simulation owns every node: it reads the pinned ones but never moves them. */
    protected override readonly ownsEveryNode = true;

    /**
     * Reset the layout's internal state. Call this before re-running layout on the same nodes
     * to ensure a fresh simulation from current positions.
     */
    reset(): void {
        this.#velocities.clear();
        this.#currentIteration = 0;
    }

    protected place(nodes: Node[], config: ForceLayoutConfig): void {
        // Recreate core with merged config to pick up runtime overrides
        this.#core = new ForceCore({
            spacing: config.spacing ?? 120,
            iterations: config.iterations ?? 50,
            seed: config.seed ?? 42,
            depthStep: 64,
            nodePadding: config.nodePadding ?? 20,
            attraction: config.attraction ?? 0.01,
            repulsion: config.repulsion ?? 10000,
            damping: config.damping ?? 0.9,
            gravity: config.gravity ?? 0.1,
            minDistance: config.minDistance ?? 50,
            maxDistance: config.maxDistance ?? 1000,
            temperature: config.temperature ?? 100,
            randomize: config.randomize ?? false,
            onProgress: config.onProgress,
        });

        // Always reset velocities for a fresh simulation
        this.#velocities.clear();
        this.#currentIteration = 0;

        // Optionally randomize positions first
        if (config.randomize) {
            const seed = config.seed ?? 42;
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

        // Initialize velocities
        for (const node of nodes) this.#velocities.set(node.id, new Vector3());

        // Run the simulation using ForceCore
        this.#core.run(
            nodes,
            (node) => this.#getEdgeLinks(node),
            (node) => this.#getNodeRadius(node, config.nodePadding ?? 20),
            (node) => this.isPinned(node),
            (node, z) => { node.position.z = z; },
        );

        // Sync positions to Three.js objects
        for (const node of nodes) {
            if (this.isPinned(node)) continue;
            this.syncPosition(node);
        }
    }

    /**
     * Get the effective collision radius for a node: diagonal of its bounds + padding.
     * This is half the distance two nodes need to sit side by side without overlapping.
     */
    #getNodeRadius(node: Node, padding: number): number {
        const bounds = node.getLayoutBounds();
        const diagonal = Math.hypot(bounds.width, bounds.height);
        return diagonal / 2 + padding;
    }

    /** Get edge links for a node (source or target). */
    #getEdgeLinks(node: Node): readonly string[] {
        const links: string[] = [];
        for (const edge of this.graph.getEdges()) {
            if (edge.source.id === node.id) links.push(edge.target.id);
            else if (edge.target.id === node.id) links.push(edge.source.id);
        }
        return links;
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

    override dispose(): void {
        super.dispose();
        this.#velocities.clear();
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