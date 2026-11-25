import { addRepulsion, buildOctree, computeBarnesHutForce, type BarnesHutConfig } from './octree';
import { DEFAULT_NODE_PADDING, diagonalRadius } from './node-bounds';

type Force = { x: number; y: number; z: number };

/** The force placement's vocabulary: what pulls a box towards another one. */
export interface ForceMeta {
    /** The ids this box is attracted to. */
    links?: readonly string[];
    /** The box's radius: half its width, the distance two boxes need to sit side by side. */
    radius?: number;
}

/** The minimal node shape the force simulation operates on. */
export interface ForceNode {
    id: string;
    position: { x: number; y: number; z: number };
    depth?: number;
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
const DEFAULT_ATTRACTION = 0.01;
const DEFAULT_REPULSION = 10000;
const DEFAULT_GRAVITY = 0.1;
const DEFAULT_MIN_DISTANCE = 50;

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
    readonly #gravity: number;
    readonly #minDistance: number;
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
        this.#gravity = config.gravity ?? DEFAULT_GRAVITY;
        this.#minDistance = config.minDistance ?? DEFAULT_MIN_DISTANCE;
        this.#randomize = config.randomize ?? false;
        this.#onProgress = config.onProgress;
        this.#useBarnesHut = config.useBarnesHut ?? (config.iterations ?? 0) > 1000;
        this.#barnesHutTheta = config.barnesHut?.theta ?? 0.5;
        this.#barnesHutMaxDepth = config.barnesHut?.maxDepth ?? 20;
        this.#barnesHutMinCellSize = config.barnesHut?.minCellSize ?? 1;
    }

    /**
     * Compute the effective collision radius for an item/node.
     * Diagonal radius = half the diagonal of the bounding box + padding.
     * This is half the distance two items need to sit side by side without overlapping.
     */
    getNodeRadius(
        item:
            | { width: number; height?: number; meta?: ForceMeta }
            | { getLayoutBounds(): { width: number; height: number } },
        padding?: number,
    ): number {
        const effectivePadding = padding ?? this.#nodePadding;
        if ('getLayoutBounds' in item)
            return diagonalRadius(item.getLayoutBounds(), effectivePadding);
        return diagonalRadius(
            { width: item.width, height: item.height ?? item.width },
            effectivePadding,
        );
    }

    /**
     * Advance the simulation by one step for a set of nodes with positions as Vector3.
     * Returns the forces applied to each node.
     */
    step<P extends ForceNode>(
        nodes: P[],
        getLinks: (node: P) => readonly string[],
        getRadius: (node: P) => number,
    ): Map<string, { x: number; y: number; z: number }> {
        if (!nodes.length) return new Map();
        const forces = this.#stepForces(
            nodes,
            getLinks,
            nodes.map((node) => getRadius(node)),
            new Map(nodes.map((node, index) => [node.id, index])),
        );
        return new Map(nodes.map((node, index) => [node.id, forces[index]!]));
    }

    /** Indexed force pass; `reuse` carries one force buffer across iterations of `run`. */
    #stepForces<P extends ForceNode>(
        nodes: P[],
        getLinks: (node: P) => readonly string[],
        radii: readonly number[],
        indexById: ReadonlyMap<string, number>,
        reuse?: Force[],
    ): Force[] {
        const count = nodes.length;
        const forces = reuse ?? nodes.map(() => ({ x: 0, y: 0, z: 0 }));
        for (let i = 0; i < count; i++) {
            const force = forces[i]!;
            force.x = 0;
            force.y = 0;
            force.z = 0;
        }

        const maxForce = this.#repulsion / (this.#minDistance * this.#minDistance);

        if (this.#useBarnesHut && count > 100) {
            const octree = buildOctree(nodes, (node) => radii[indexById.get(node.id)!] ?? 1, {
                theta: this.#barnesHutTheta,
                maxDepth: this.#barnesHutMaxDepth,
                minCellSize: this.#barnesHutMinCellSize,
            });
            for (let i = 0; i < count; i++) {
                const node = nodes[i]!;
                const force = computeBarnesHutForce(
                    { position: node.position, id: node.id },
                    octree,
                    this.#barnesHutTheta,
                    this.#repulsion,
                    this.#minDistance,
                    maxForce,
                );
                const target = forces[i]!;
                target.x += force.x;
                target.y += force.y;
                target.z += force.z;
            }
        } else {
            for (let i = 0; i < count; i++) {
                const a = nodes[i]!;
                const forceA = forces[i]!;
                for (let j = i + 1; j < count; j++) {
                    const b = nodes[j]!;
                    const dx = a.position.x - b.position.x;
                    const dy = a.position.y - b.position.y;
                    const dz = a.position.z - b.position.z;
                    const distSq = dx * dx + dy * dy + dz * dz;
                    const dist = Math.sqrt(distSq) || 0.001;
                    const minDist = radii[i]! + radii[j]!;

                    addRepulsion(
                        forceA,
                        dx,
                        dy,
                        dz,
                        distSq,
                        dist,
                        this.#repulsion,
                        minDist,
                        maxForce,
                    );
                    addRepulsion(
                        forces[j]!,
                        -dx,
                        -dy,
                        -dz,
                        distSq,
                        dist,
                        this.#repulsion,
                        minDist,
                        maxForce,
                    );
                }
            }
        }

        for (let i = 0; i < count; i++) {
            const node = nodes[i]!;
            const force = forces[i]!;
            for (const link of getLinks(node)) {
                const targetIndex = indexById.get(link);
                if (targetIndex === undefined) continue;
                const target = nodes[targetIndex]!.position;
                force.x += (target.x - node.position.x) * this.#attraction;
                force.y += (target.y - node.position.y) * this.#attraction;
                force.z += (target.z - node.position.z) * this.#attraction;
            }
        }

        for (let i = 0; i < count; i++) {
            const node = nodes[i]!;
            const force = forces[i]!;
            force.x -= node.position.x * this.#gravity;
            force.y -= node.position.y * this.#gravity;
            force.z -= node.position.z * this.#gravity;
        }

        return forces;
    }

    /**
     * Final separation pass: push overlapping nodes apart until no overlaps remain.
     * Large graphs use fewer passes; Barnes-Hut repulsion has already spread them.
     */
    separateOverlaps<P extends ForceNode>(
        nodes: P[],
        getRadius: (node: P) => number,
        isPinned: (node: P) => boolean,
    ): void {
        separateOverlappingNodes(nodes, getRadius, isPinned, nodes.length > 150 ? 1 : 30);
    }

    /**
     * Initialize positions deterministically using golden angle spiral.
     */
    initializePositions<P extends ForceNode>(
        nodes: P[],
        previous?: Map<string, { x: number; y: number; z: number }>,
    ): void {
        for (const [i, node] of nodes.entries()) {
            const id = node.id;

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
                node.position.x = (rand - 0.5) * 400;
                node.position.y = (rand2 - 0.5) * 400;
                node.position.z = (rand3 - 0.5) * 400;
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
    run<P extends ForceNode>(
        nodes: P[],
        getLinks: (node: P) => readonly string[],
        getRadius: (node: P) => number,
        isPinned: (node: P) => boolean,
        setDepth: (node: P, z: number) => void,
        previous?: Map<string, { x: number; y: number; z: number }>,
    ): void {
        this.initializePositions(nodes, previous);

        // The simulation adapts iterations based on node count for performance
        const k = this.#spacing;
        const iterations =
            nodes.length > 150
                ? Math.min(1, this.#iterations)
                : Math.max(
                      60,
                      Math.min(
                          this.#iterations,
                          Math.round((9000 * this.#iterations) / (300 * nodes.length)),
                      ),
                  );

        const radii = nodes.map((node) => getRadius(node));
        const indexById = new Map(nodes.map((node, index) => [node.id, index]));
        let forces: Force[] | undefined;

        for (let step = 0; step < iterations; step++) {
            const heat = (k / 2) * (1 - step / iterations);
            forces = this.#stepForces(nodes, getLinks, radii, indexById, forces);

            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i]!;
                if (isPinned(node)) continue;
                const force = forces[i]!;
                const magnitude = Math.sqrt(force.x ** 2 + force.y ** 2 + force.z ** 2);

                if (magnitude === 0) continue;
                const limit = Math.min(magnitude, heat) / magnitude;
                node.position.x += force.x * limit;
                node.position.y += force.y * limit;
                node.position.z += force.z * limit;
            }

            this.#onProgress?.(step + 1, iterations);
        }

        // Final separation pass. Barnes-Hut repulsion already separates large graphs.
        if (nodes.length <= 150) this.separateOverlaps(nodes, getRadius, isPinned);

        // Apply depth-based Z
        for (const node of nodes) {
            if (isPinned(node)) continue;
            setDepth(node, (node.depth ?? 0) * this.#depthStep);
        }
    }
}

/** Push overlapping nodes apart in place, stopping early once no overlap remains. */
export function separateOverlappingNodes<P extends ForceNode>(
    nodes: P[],
    getRadius: (node: P) => number,
    isPinned: (node: P) => boolean,
    passes: number,
): void {
    const radii = nodes.map((node) => getRadius(node));
    const pinned = nodes.map((node) => isPinned(node));

    for (let pass = 0; pass < passes; pass++) {
        let anyOverlap = false;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                if (pinned[i] && pinned[j]) continue;
                const a = nodes[i];
                const b = nodes[j];

                const dx = a.position.x - b.position.x;
                const dy = a.position.y - b.position.y;
                const dz = a.position.z - b.position.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;

                const needed = radii[i]! + radii[j]!;
                if (dist >= needed) continue;

                anyOverlap = true;
                const shove = (needed - dist) / 2;
                const fx = (dx / dist) * shove;
                const fy = (dy / dist) * shove;
                const fz = (dz / dist) * shove;

                if (!pinned[i]) {
                    a.position.x += fx;
                    a.position.y += fy;
                    a.position.z += fz;
                }
                if (!pinned[j]) {
                    b.position.x -= fx;
                    b.position.y -= fy;
                    b.position.z -= fz;
                }
            }
        }
        if (!anyOverlap) break;
    }
}
