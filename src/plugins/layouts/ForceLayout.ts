import { ForceCore, type ForceCoreConfig } from '../../layout/force-core';
import type { Node } from '../../nodes/Node';
import { appendTo } from '../../utils/collection';
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
    /** Progress callback: fired each iteration with (iteration, total). */
    onProgress?: (iteration: number, total: number) => void;
    /** Use Barnes-Hut octree for O(n log n) repulsion on large graphs (auto-enabled for >100 nodes). */
    useBarnesHut?: boolean;
    /** Barnes-Hut theta threshold: cell size / distance < theta = approximate. Default: 0.5. */
    barnesHutTheta?: number;
    /** Barnes-Hut maximum tree depth. Default: 20. */
    barnesHutMaxDepth?: number;
    /** Barnes-Hut minimum cell size. Default: 1. */
    barnesHutMinCellSize?: number;
}

export const DEFAULT_FORCE_LAYOUT = {
    repulsion: 10000,
    attraction: 0.01,
    damping: 0.9,
    gravity: 0.1,
    minDistance: 50,
    maxDistance: 1000,
    iterations: 50,
    temperature: 100,
    spacing: 120,
} as const;

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

    #core: ForceCore;

    constructor(config: Partial<ForceLayoutConfig> = {}) {
        super(config);
        this.#core = new ForceCore(this.#coreConfig(config));
    }

    #coreConfig(config: Partial<ForceLayoutConfig>): ForceCoreConfig {
        return {
            spacing: config.spacing ?? DEFAULT_FORCE_LAYOUT.spacing,
            iterations: config.iterations ?? DEFAULT_FORCE_LAYOUT.iterations,
            seed: config.seed ?? 42,
            depthStep: 64,
            nodePadding: this.nodePadding(config),
            attraction: config.attraction ?? DEFAULT_FORCE_LAYOUT.attraction,
            repulsion: config.repulsion ?? DEFAULT_FORCE_LAYOUT.repulsion,
            damping: config.damping ?? DEFAULT_FORCE_LAYOUT.damping,
            gravity: config.gravity ?? DEFAULT_FORCE_LAYOUT.gravity,
            minDistance: config.minDistance ?? DEFAULT_FORCE_LAYOUT.minDistance,
            maxDistance: config.maxDistance ?? DEFAULT_FORCE_LAYOUT.maxDistance,
            temperature: config.temperature ?? DEFAULT_FORCE_LAYOUT.temperature,
            randomize: config.randomize ?? false,
            onProgress: config.onProgress,
            useBarnesHut: config.useBarnesHut,
            barnesHut: {
                theta: config.barnesHutTheta,
                maxDepth: config.barnesHutMaxDepth,
                minCellSize: config.barnesHutMinCellSize,
            },
        };
    }

    /** The simulation owns every node: it reads the pinned ones but never moves them. */
    protected override readonly ownsEveryNode = true;

    /** Compatibility no-op: the simulation rebuilds its state on every placement. */
    reset(): void {}

    protected place(nodes: Node[], config: ForceLayoutConfig): void {
        // Recreate core with merged config to pick up runtime overrides
        this.#core = new ForceCore(this.#coreConfig(config));

        // One pass over the edges serves every simulation step; scanning them per node per step is O(N·E).
        const links = new Map<string, string[]>();
        for (const edge of this.graph.getEdges()) {
            appendTo(links, edge.source.id, edge.target.id);
            if (edge.source.id !== edge.target.id) appendTo(links, edge.target.id, edge.source.id);
        }

        // Run the simulation using ForceCore
        this.#core.run(
            nodes,
            (node) => links.get(node.id) ?? [],
            (node) => this.collisionRadius(node, this.nodePadding(config)),
            (node) => this.isPinned(node),
            (node, z) => {
                node.position.z = z;
            },
        );

        // Sync positions to Three.js objects
        for (const node of nodes) {
            if (this.isPinned(node)) continue;
            this.syncPosition(node);
        }
    }

    protected defaultConfig(): ForceLayoutConfig {
        return { ...DEFAULT_FORCE_LAYOUT, duration: 1.0 };
    }
}
