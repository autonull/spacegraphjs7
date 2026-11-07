import type { Placement, PlacementItem, Position } from './placement';
import { buildOctree, computeBarnesHutForce, type OctreeNode, type BarnesHutConfig } from './octree';

/** The force placement's vocabulary: what pulls a box towards another one. */
export interface ForceMeta {
    /** The ids this box is attracted to. */
    links?: readonly string[];
    /** The box's radius: half its width, the distance two boxes need to sit side by side. */
    radius?: number;
}

export interface ForceCoreConfig {
    /** The distance two boxes rest at (repulsion equilibrium). */
    spacing?: number;
    /** The simulation steps. */
    iterations?: number;
    /** The seed of the initial placement. */
    seed?: number;
    /** The Z distance per depth. */
    depthStep?: number;
    /** Extra padding between nodes for collision avoidance. */
    nodePadding?: number;
    /** Attraction strength along links/edges. */
    attraction?: number;
    /** Repulsion strength. */
    repulsion?: number;
    /** Damping factor for velocity. */
    damping?: number;
    /** Gravity towards center. */
    gravity?: number;
    /** Minimum distance for force calculation. */
    minDistance?: number;
    /** Maximum distance for force application. */
    maxDistance?: number;
    /** Temperature for cooling schedule. */
    temperature?: number;
    /** If true, nodes start from random positions instead of current positions. */
    randomize?: boolean;
    /** Progress callback: fired each iteration with (iteration, total). */
    onProgress?: (iteration: number, total: number) => void;
    /** Use Barnes-Hut octree for O(n log n) repulsion (for large graphs). */
    useBarnesHut?: boolean;
    /** Barnes-Hut configuration. */
    barnesHut?: Partial<BarnesHutConfig>;
}

const DEFAULT_SPACING = 240;
const DEFAULT_ITERATIONS = 300;
const DEFAULT_DEPTH_STEP = 64;
const DEFAULT_NODE_PADDING = 20;
const DEFAULT_ATTRACTION = 0.01;
const DEFAULT_REPULSION = 10000;
const DEFAULT_DAMPING = 0.9;
const DEFAULT_GRAVITY = 0.1;
const DEFAULT_MIN_DISTANCE = 50;
const DEFAULT_MAX_DISTANCE = 1000;
const DEFAULT_TEMPERATURE = 100;

/** The golden angle: it spreads the initial placement without a random number generator. */
const GOLDEN_ANGLE = 2.399963229728653;

/**
 * Shared core for force-directed layouts.
 * 
 * Both ForcePlacement (session-graph's internal engine) and ForceLayout (public plugin)
 * now use this core. This eliminates drift between the two engines and halves maintenance.
 */
export class ForceCore {
    readonly #spacing: number;
    readonly #iterations: number;
    readonly #seed: number;
    readonly #depthStep: number;
    readonly #nodePadding: number;
    readonly #attraction: number;
    readonly #repulsion: number;
    readonly #damping: number;
    readonly #gravity: number;
    readonly #minDistance: number;
    readonly #maxDistance: number;
    readonly #temperature: number;
    readonly #randomize: boolean;
    readonly #onProgress?: (iteration: number, total: number) => void;
    readonly #useBarnesHut: boolean;
    readonly #barnesHutTheta: number;
    readonly #barnesHutMaxDepth: number;
    readonly #barnesHutMinCellSize: number;

    constructor(config: ForceCoreConfig = {}) {
        this.#spacing = config.spacing ?? DEFAULT_SPACING;
        this.#iterations = config.iterations ?? DEFAULT_ITERATIONS;
        this.#seed = config.seed ?? 1;
        this.#depthStep = config.depthStep ?? DEFAULT_DEPTH_STEP;
        this.#nodePadding = config.nodePadding ?? DEFAULT_NODE_PADDING;
        this.#attraction = config.attraction ?? DEFAULT_ATTRACTION;
        this.#repulsion = config.repulsion ?? DEFAULT_REPULSION;
        this.#damping = config.damping ?? DEFAULT_DAMPING;
        this.#gravity = config.gravity ?? DEFAULT_GRAVITY;
        this.#minDistance = config.minDistance ?? DEFAULT_MIN_DISTANCE;
        this.#maxDistance = config.maxDistance ?? DEFAULT_MAX_DISTANCE;
        this.#temperature = config.temperature ?? DEFAULT_TEMPERATURE;
        this.#randomize = config.randomize ?? false;
        this.#onProgress = config.onProgress;
        this.#useBarnesHut = config.useBarnesHut ?? (config.iterations && config.iterations > 1000);
        this.#barnesHutTheta = config.barnesHut?.theta ?? 0.5;
        this.#barnesHutMaxDepth = config.barnesHut?.maxDepth ?? 20;
        this.#barnesHutMinCellSize = config.barnesHut?.minCellSize ?? 1;
    }

    /**
     * Compute the effective collision radius for an item/node.
     * Diagonal radius = half the diagonal of the bounding box + padding.
     * This is half the distance two items need to sit side by side without overlapping.
     */
    getNodeRadius(item: { width: number; height?: number; meta?: ForceMeta } | { getLayoutBounds(): { width: number; height: number } }, padding?: number): number {
        const effectivePadding = padding ?? this.#nodePadding;
        let width: number, height: number;

        if ('getLayoutBounds' in item) {
            const bounds = item.getLayoutBounds();
            width = bounds.width;
            height = bounds.height;
        } else {
            width = item.width;
            height = item.height ?? item.width; // default to width if height not provided
        }

        // Diagonal radius: half the diagonal of the bounding box
        const diagonal = Math.hypot(width, height);
        return diagonal / 2 + effectivePadding;
    }

    /**
     * Advance the simulation by one step for a set of nodes with positions as Vector3.
     * Returns the forces applied to each node.
     */
    step<P extends { position: { x: number; y: number; z: number } }>(
        nodes: P[],
        getLinks: (node: P) => readonly string[],
        getRadius: (node: P) => number,
        isPinned: (node: P) => boolean,
    ): Map<string, { x: number; y: number; z: number }> {
        if (!nodes.length) return new Map();

        const forces = new Map<string, { x: number; y: number; z: number }>();
        for (const node of nodes) forces.set(node.id ?? String(nodes.indexOf(node)), { x: 0, y: 0, z: 0 });

        // Precompute radii (used as mass for Barnes-Hut)
        const radii = new Map<string, number>();
        for (const node of nodes) {
            const id = node.id ?? String(nodes.indexOf(node));
            radii.set(id, getRadius(node));
        }

        const maxForce = this.#repulsion / (this.#minDistance * this.#minDistance);

        if (this.#useBarnesHut && nodes.length > 100) {
            // Build octree for Barnes-Hut approximation
            const octree = buildOctree(nodes, (node) => radii.get(node.id ?? '') ?? 1, {
                theta: this.#barnesHutTheta,
                maxDepth: this.#barnesHutMaxDepth,
                minCellSize: this.#barnesHutMinCellSize,
            });

            // Compute repulsion using Barnes-Hut
            for (const node of nodes) {
                const id = node.id ?? String(nodes.indexOf(node));
                const force = computeBarnesHutForce(
                    { position: node.position, id },
                    octree,
                    this.#barnesHutTheta,
                    this.#repulsion,
                    this.#minDistance,
                    maxForce,
                );
                const f = forces.get(id)!;
                f.x += force.x;
                f.y += force.y;
                f.z += force.z;
            }
        } else {
            // Repulsion: all-pairs (exact for small graphs)
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];
                    const dx = a.position.x - b.position.x;
                    const dy = a.position.y - b.position.y;
                    const dz = a.position.z - b.position.z;
                    const distSq = dx * dx + dy * dy + dz * dz;
                    const dist = Math.sqrt(distSq) || 0.001;

                    // Per-pair minimum distance based on node sizes
                    const idA = a.id ?? String(i);
                    const idB = b.id ?? String(j);
                    const minDist = (radii.get(idA) ?? 0) + (radii.get(idB) ?? 0);
                    const effectiveDistSq = Math.max(distSq, minDist * minDist);

                    const repulsion = this.#repulsion / effectiveDistSq;
                    const force = Math.min(repulsion, maxForce);
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    const fz = (dz / dist) * force;

                    const forceA = forces.get(idA)!;
                    const forceB = forces.get(idB)!;
                    forceA.x += fx; forceA.y += fy; forceA.z += fz;
                    forceB.x -= fx; forceB.y -= fy; forceB.z -= fz;
                }
            }
        }

        // Attraction along links/edges
        for (const node of nodes) {
            const id = node.id ?? String(nodes.indexOf(node));
            const force = forces.get(id)!;
            for (const link of getLinks(node)) {
                const target = nodes.find(n => (n.id ?? String(nodes.indexOf(n))) === link);
                if (!target) continue;

                const dx = target.position.x - node.position.x;
                const dy = target.position.y - node.position.y;
                const dz = target.position.z - node.position.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;

                const pull = this.#attraction * dist;
                const fx = (dx / dist) * pull;
                const fy = (dy / dist) * pull;
                const fz = (dz / dist) * pull;

                force.x += fx; force.y += fy; force.z += fz;
            }
        }

        // Gravity towards center
        for (const node of nodes) {
            const id = node.id ?? String(nodes.indexOf(node));
            const force = forces.get(id)!;
            const dist = Math.sqrt(node.position.x ** 2 + node.position.y ** 2 + node.position.z ** 2);
            if (dist > 0) {
                const gx = -node.position.x / dist * this.#gravity * dist;
                const gy = -node.position.y / dist * this.#gravity * dist;
                const gz = -node.position.z / dist * this.#gravity * dist;
                force.x += gx; force.y += gy; force.z += gz;
            }
        }

        return forces;
    }

    /**
     * Final separation pass: push overlapping nodes apart until no overlaps remain.
     * Uses 30 passes (same pattern as original ForcePlacement).
     */
    separateOverlaps<P extends { position: { x: number; y: number; z: number } }>(
        nodes: P[],
        getRadius: (node: P) => number,
        isPinned: (node: P) => boolean,
    ): void {
        // Precompute radii
        const radii = new Map<string, number>();
        for (const node of nodes) {
            const id = node.id ?? String(nodes.indexOf(node));
            radii.set(id, getRadius(node));
        }

        // 30-pass separation
        for (let pass = 0; pass < 30; pass++) {
            let anyOverlap = false;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];
                    if (isPinned(a) && isPinned(b)) continue;

                    const dx = a.position.x - b.position.x;
                    const dy = a.position.y - b.position.y;
                    const dz = a.position.z - b.position.z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;

                    const idA = a.id ?? String(i);
                    const idB = b.id ?? String(j);
                    const needed = (radii.get(idA) ?? 0) + (radii.get(idB) ?? 0);

                    if (dist < needed) {
                        anyOverlap = true;
                        const shove = (needed - dist) / 2;
                        const fx = (dx / dist) * shove;
                        const fy = (dy / dist) * shove;
                        const fz = (dz / dist) * shove;

                        if (!isPinned(a)) {
                            a.position.x += fx;
                            a.position.y += fy;
                            a.position.z += fz;
                        }
                        if (!isPinned(b)) {
                            b.position.x -= fx;
                            b.position.y -= fy;
                            b.position.z -= fz;
                        }
                    }
                }
            }
            if (!anyOverlap) break;
        }
    }

    /**
     * Initialize positions deterministically using golden angle spiral.
     */
    initializePositions<P extends { position: { x: number; y: number; z: number } }>(
        nodes: P[],
        isPinned: (node: P) => boolean,
        previous?: Map<string, { x: number; y: number; z: number }>,
    ): void {
        for (const [i, node] of nodes.entries()) {
            const id = node.id ?? String(i);

            if (previous?.has(id)) {
                const prev = previous.get(id)!;
                node.position.x = prev.x;
                node.position.y = prev.y;
                node.position.z = prev.z;
                continue;
            }

            if (this.#randomize) {
                // Use mulberry32 for deterministic random
                let t = (this.#seed + i) >>> 0;
                t += 0x6d2b79f5;
                let r = Math.imul(t ^ (t >>> 15), 1 | t);
                r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
                const rand = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
                t = (t + 0x6d2b79f5) >>> 0;
                const r2 = Math.imul(t ^ (t >>> 15), 1 | t);
                const rand2 = ((r2 ^ (r2 >>> 14)) >>> 0) / 4294967296;
                t = (t + 0x6d2b79f5) >>> 0;
                const r3 = Math.imul(t ^ (t >>> 15), 1 | t);
                const rand3 = ((r3 ^ (r3 >>> 14)) >>> 0) / 4294967296;
                node.position.set(
                    (rand - 0.5) * 400,
                    (rand2 - 0.5) * 400,
                    (rand3 - 0.5) * 400,
                );
            } else {
                const angle = (i + this.#seed) * GOLDEN_ANGLE;
                const radius = (this.#spacing * Math.sqrt(i + 1)) / 2;
                node.position.x = Math.cos(angle) * radius;
                node.position.y = Math.sin(angle) * radius;
                node.position.z = 0;
            }
        }
    }

    /**
     * Run the full simulation.
     */
    run<P extends { position: { x: number; y: number; z: number } }>(
        nodes: P[],
        getLinks: (node: P) => readonly string[],
        getRadius: (node: P) => number,
        isPinned: (node: P) => boolean,
        setDepth: (node: P, z: number) => void,
        previous?: Map<string, { x: number; y: number; z: number }>,
    ): void {
        this.initializePositions(nodes, isPinned, previous);

        // The simulation adapts iterations based on node count for performance
        const k = this.#spacing;
        const iterations = Math.max(
            60,
            Math.min(
                this.#iterations,
                Math.round((9000 * this.#iterations) / (300 * nodes.length)),
            ),
        );

        for (let step = 0; step < iterations; step++) {
            const heat = (k / 2) * (1 - step / iterations);
            const forces = this.step(nodes, getLinks, getRadius, isPinned);

            for (const node of nodes) {
                if (isPinned(node)) continue;
                const id = node.id ?? String(nodes.indexOf(node));
                const force = forces.get(id)!;
                const magnitude = Math.sqrt(force.x ** 2 + force.y ** 2 + force.z ** 2);

                if (magnitude === 0) continue;
                const limit = Math.min(magnitude, heat) / magnitude;
                node.position.x += force.x * limit;
                node.position.y += force.y * limit;
                node.position.z += force.z * limit;
            }

            this.#onProgress?.(step + 1, iterations);
        }

        // Final separation pass
        this.separateOverlaps(nodes, getRadius, isPinned);

        // Apply depth-based Z
        for (const node of nodes) {
            if (isPinned(node)) continue;
            setDepth(node, (node.depth ?? 0) * this.#depthStep);
        }
    }
}