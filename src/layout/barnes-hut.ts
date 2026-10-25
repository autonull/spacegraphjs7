import type { Placement, PlacementItem, Position } from './placement';

/** The force placement's vocabulary: what pulls a box towards another one. */
export interface ForceMeta {
    /** The ids this box is attracted to. */
    links?: readonly string[];
    /** The box's radius: half its width, the distance two boxes need to sit side by side. */
    radius?: number;
}

export interface ForceConfig {
    /** The distance two boxes rest at. */
    spacing?: number;
    /** The simulation steps. */
    iterations?: number;
    /** The seed of the initial placement. */
    seed?: number;
    /** The Z distance per depth. */
    depthStep?: number;
    /** Use Barnes-Hut optimization for large graphs (n > threshold). */
    barnesHut?: boolean;
    /** Barnes-Hut theta parameter (0.5-1.0). Lower = more accurate. */
    theta?: number;
    /** Threshold to switch to Barnes-Hut. */
    barnesHutThreshold?: number;
}

const DEFAULT_SPACING = 240;
const DEFAULT_ITERATIONS = 300;
const DEFAULT_DEPTH_STEP = 64;
const DEFAULT_THETA = 0.5;
const DEFAULT_BARNES_HUT_THRESHOLD = 500;

/** The golden angle: it spreads the initial placement without a random number generator. */
const GOLDEN_ANGLE = 2.399963229728653;

/**
 * Quadtree node for Barnes-Hut force calculation.
 */
interface QuadNode {
    /** Center of mass X */
    cx: number;
    /** Center of mass Y */
    cy: number;
    /** Total mass */
    mass: number;
    /** Bounding box */
    x: number;
    y: number;
    width: number;
    height: number;
    /** Child quadrants: NW, NE, SW, SE */
    children: (QuadNode | null)[];
    /** Leaf node ID if this is a leaf */
    leafId?: string;
    /** Is this a leaf with a body? */
    isLeaf: boolean;
}

/**
 * Barnes-Hut force placement: O(n log n) force-directed layout using quadtree.
 * For large graphs (n > threshold), uses quadtree approximation instead of all-pairs.
 * Falls back to grid-based approximation for smaller graphs.
 */
export class ForcePlacement implements Placement<ForceMeta> {
    readonly name = 'force';
    readonly #spacing: number;
    readonly #iterations: number;
    readonly #seed: number;
    readonly #depthStep: number;
    readonly #barnesHut: boolean;
    readonly #theta: number;
    readonly #barnesHutThreshold: number;

    constructor(config: ForceConfig = {}) {
        this.#spacing = config.spacing ?? DEFAULT_SPACING;
        this.#iterations = config.iterations ?? DEFAULT_ITERATIONS;
        this.#seed = config.seed ?? 1;
        this.#depthStep = config.depthStep ?? DEFAULT_DEPTH_STEP;
        this.#barnesHut = config.barnesHut ?? true;
        this.#theta = config.theta ?? DEFAULT_THETA;
        this.#barnesHutThreshold = config.barnesHutThreshold ?? DEFAULT_BARNES_HUT_THRESHOLD;
    }

    place(
        items: readonly PlacementItem<ForceMeta>[],
        previous?: ReadonlyMap<string, Position>,
    ): ReadonlyMap<string, Position> {
        const points = new Map<string, { x: number; y: number; mass: number }>();
        const pinned = new Set<string>();
        const radii = new Map<string, number>();

        for (const [i, item] of items.entries()) {
            const frozen = previous?.get(item.id);

            if (frozen) {
                points.set(item.id, { x: frozen.x, y: frozen.y, mass: item.meta?.radius ?? this.#spacing / 2 });
                pinned.add(item.id);
                radii.set(item.id, item.meta?.radius ?? this.#spacing / 2);
                continue;
            }

            const angle = (i + this.#seed) * GOLDEN_ANGLE;
            const radius = (this.#spacing * Math.sqrt(i + 1)) / 2;
            points.set(item.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, mass: item.meta?.radius ?? this.#spacing / 2 });
            radii.set(item.id, item.meta?.radius ?? this.#spacing / 2);
        }

        const k = this.#spacing;
        const useBarnesHut = this.#barnesHut && items.length > this.#barnesHutThreshold;
        const iterations = Math.max(
            60,
            Math.min(this.#iterations, Math.round((9000 * this.#iterations) / (300 * items.length))),
        );

        for (let step = 0; step < iterations; step++) {
            const heat = (k / 2) * (1 - step / iterations);

            if (useBarnesHut) {
                this.#barnesHutStep(items, points, pinned, radii, k, heat);
            } else {
                this.#gridStep(items, points, pinned, radii, k, heat);
            }
        }

        // Final collision resolution pass
        for (let pass = 0; pass < 30; pass++) {
            if (useBarnesHut) {
                this.#barnesHutCollisionPass(items, points, pinned, radii);
            } else {
                this.#gridCollisionPass(items, points, pinned, radii);
            }
        }

        const positions = new Map<string, Position>();

        for (const item of items) {
            const point = points.get(item.id);

            if (!point) continue;
            positions.set(item.id, {
                x: point.x,
                y: point.y,
                z: (item.depth ?? 0) * this.#depthStep,
            });
        }

        return positions;
    }

    /**
     * Grid-based force calculation (original implementation).
     * Used for smaller graphs or when Barnes-Hut is disabled.
     */
    #gridStep(
        items: readonly PlacementItem<ForceMeta>[],
        points: Map<string, { x: number; y: number; mass: number }>,
        pinned: Set<string>,
        radii: Map<string, number>,
        k: number,
        heat: number,
    ): void {
        const cell = Math.max(...radii.values(), k / 2) * 2;
        const cells = this.#bucket(points, cell);

        for (const item of items) {
            if (pinned.has(item.id)) continue;
            const point = points.get(item.id)!;
            let fx = 0;
            let fy = 0;

            for (const other of this.#neighbours(cells, points, item.id, cell)) {
                if (other === item.id) continue;
                const target = points.get(other)!;
                const dx = point.x - target.x;
                const dy = point.y - target.y;
                const distance = Math.hypot(dx, dy) || 0.01;
                const push = (k * k) / distance;
                fx += (dx / distance) * push;
                fy += (dy / distance) * push;

                // Collision term
                const needed = radii.get(item.id)! + radii.get(other)!;

                if (distance < needed) {
                    const shove = ((needed - distance) / distance) * needed;
                    fx += (dx / distance) * shove;
                    fy += (dy / distance) * shove;
                }
            }

            for (const link of item.meta?.links ?? []) {
                const target = points.get(link);

                if (!target) continue;
                const dx = target.x - point.x;
                const dy = target.y - point.y;
                const distance = Math.hypot(dx, dy) || 0.01;
                const pull = (distance * distance) / k;
                fx += (dx / distance) * pull;
                fy += (dy / distance) * pull;
            }

            const magnitude = Math.hypot(fx, fy);

            if (magnitude === 0) continue;
            const limit = Math.min(magnitude, heat) / magnitude;
            point.x += fx * limit;
            point.y += fy * limit;
        }
    }

    /**
     * Barnes-Hut force calculation using quadtree.
     * O(n log n) instead of O(n²).
     */
    #barnesHutStep(
        items: readonly PlacementItem<ForceMeta>[],
        points: Map<string, { x: number; y: number; mass: number }>,
        pinned: Set<string>,
        radii: Map<string, number>,
        k: number,
        heat: number,
    ): void {
        // Build quadtree
        const bounds = this.#computeBounds(points);
        const quadtree = this.#buildQuadtree(points, bounds);

        for (const item of items) {
            if (pinned.has(item.id)) continue;
            const point = points.get(item.id)!;
            let fx = 0;
            let fy = 0;

            // Repulsion from quadtree
            this.#calculateRepulsion(quadtree, point, point.mass, k, this.#theta, fx, fy, (dfx, dfy) => {
                fx += dfx;
                fy += dfy;
            });

            // Attraction to linked nodes
            for (const link of item.meta?.links ?? []) {
                const target = points.get(link);

                if (!target) continue;
                const dx = target.x - point.x;
                const dy = target.y - point.y;
                const distance = Math.hypot(dx, dy) || 0.01;
                const pull = (distance * distance) / k;
                fx += (dx / distance) * pull;
                fy += (dy / distance) * pull;
            }

            // Collision detection (still uses grid for local precision)
            const cell = Math.max(...radii.values(), k / 2) * 2;
            const cells = this.#bucket(points, cell);

            for (const other of this.#neighbours(cells, points, item.id, cell)) {
                if (other === item.id) continue;
                const target = points.get(other)!;
                const dx = point.x - target.x;
                const dy = point.y - target.y;
                const distance = Math.hypot(dx, dy) || 0.01;
                const needed = radii.get(item.id)! + radii.get(other)!;

                if (distance < needed) {
                    const shove = ((needed - distance) / distance) * needed;
                    fx += (dx / distance) * shove;
                    fy += (dy / distance) * shove;
                }
            }

            const magnitude = Math.hypot(fx, fy);

            if (magnitude === 0) continue;
            const limit = Math.min(magnitude, heat) / magnitude;
            point.x += fx * limit;
            point.y += fy * limit;
        }
    }

    /**
     * Calculates repulsion force from quadtree.
     * Uses a callback to accumulate forces.
     */
    #calculateRepulsion(
        node: QuadNode,
        point: { x: number; y: number; mass: number },
        mass: number,
        k: number,
        theta: number,
        fx: number,
        fy: number,
        accumulate: (dfx: number, dfy: number) => void,
    ): void {
        if (!node || node.mass === 0) return;

        const dx = node.cx - point.x;
        const dy = node.cy - point.y;
        const distance = Math.hypot(dx, dy) || 0.01;

        // If this is a leaf node (single body), calculate direct force
        if (node.isLeaf) {
            if (node.leafId && point.mass === node.mass && Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
                return; // Skip self
            }
            const push = (k * k * mass * node.mass) / (distance * distance);
            accumulate((dx / distance) * push, (dy / distance) * push);
            return;
        }

        // Check if we can approximate this node as a single body
        const size = Math.max(node.width, node.height);
        if (size / distance < theta) {
            // Treat as single body at center of mass
            const push = (k * k * mass * node.mass) / (distance * distance);
            accumulate((dx / distance) * push, (dy / distance) * push);
            return;
        }

        // Otherwise, recurse into children
        for (const child of node.children) {
            if (child) {
                this.#calculateRepulsion(child, point, mass, k, theta, fx, fy, accumulate);
            }
        }
    }

    /**
     * Collision pass using Barnes-Hut (approximate) for large graphs.
     */
    #barnesHutCollisionPass(
        items: readonly PlacementItem<ForceMeta>[],
        points: Map<string, { x: number; y: number; mass: number }>,
        pinned: Set<string>,
        radii: Map<string, number>,
    ): void {
        const cell = Math.max(...radii.values(), this.#spacing / 2) * 2;
        const cells = this.#bucket(points, cell);

        for (const item of items) {
            if (pinned.has(item.id)) continue;
            const point = points.get(item.id)!;
            let fx = 0;
            let fy = 0;

            for (const other of this.#neighbours(cells, points, item.id, cell)) {
                if (other === item.id) continue;
                const target = points.get(other)!;
                const dx = point.x - target.x;
                const dy = point.y - target.y;
                const distance = Math.hypot(dx, dy) || 0.01;
                const needed = radii.get(item.id)! + radii.get(other)!;

                if (distance >= needed) continue;
                const shove = (needed - distance) / 2;
                fx += (dx / distance) * shove;
                fy += (dy / distance) * shove;
            }

            point.x += fx;
            point.y += fy;
        }
    }

    /**
     * Grid-based collision pass (original).
     */
    #gridCollisionPass(
        items: readonly PlacementItem<ForceMeta>[],
        points: Map<string, { x: number; y: number; mass: number }>,
        pinned: Set<string>,
        radii: Map<string, number>,
    ): void {
        const cell = Math.max(...radii.values(), this.#spacing / 2) * 2;
        const cells = this.#bucket(points, cell);

        for (const item of items) {
            if (pinned.has(item.id)) continue;
            const point = points.get(item.id)!;
            let fx = 0;
            let fy = 0;

            for (const other of this.#neighbours(cells, points, item.id, cell)) {
                if (other === item.id) continue;
                const target = points.get(other)!;
                const dx = point.x - target.x;
                const dy = point.y - target.y;
                const distance = Math.hypot(dx, dy) || 0.01;
                const needed = radii.get(item.id)! + radii.get(other)!;

                if (distance >= needed) continue;
                const shove = (needed - distance) / 2;
                fx += (dx / distance) * shove;
                fy += (dy / distance) * shove;
            }

            point.x += fx;
            point.y += fy;
        }
    }

    /**
     * Computes bounding box of all points.
     */
    #computeBounds(points: Map<string, { x: number; y: number; mass: number }>): { x: number; y: number; width: number; height: number } {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const { x, y } of points.values()) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }

        // Add padding
        const padding = this.#spacing * 2;
        return {
            x: minX - padding,
            y: minY - padding,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2,
        };
    }

    /**
     * Builds a quadtree from the points.
     */
    #buildQuadtree(
        points: Map<string, { x: number; y: number; mass: number }>,
        bounds: { x: number; y: number; width: number; height: number },
    ): QuadNode {
        const root: QuadNode = {
            cx: 0,
            cy: 0,
            mass: 0,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            children: [null, null, null, null],
            isLeaf: false,
        };

        for (const [id, { x, y, mass }] of points) {
            this.#insertIntoQuadtree(root, id, x, y, mass);
        }

        return root;
    }

    /**
     * Inserts a body into the quadtree.
     */
    #insertIntoQuadtree(
        node: QuadNode,
        id: string,
        x: number,
        y: number,
        mass: number,
    ): void {
        // Update center of mass
        const totalMass = node.mass + mass;
        node.cx = (node.cx * node.mass + x * mass) / totalMass;
        node.cy = (node.cy * node.mass + y * mass) / totalMass;
        node.mass = totalMass;

        // If this is an empty leaf, make it a leaf with this body
        if (node.isLeaf && node.leafId === undefined) {
            node.leafId = id;
            return;
        }

        // If this is a leaf with a body, subdivide
        if (node.isLeaf) {
            this.#subdivide(node);
        }

        // Determine quadrant and recurse
        const quadrant = this.#getQuadrant(node, x, y);
        const child = node.children[quadrant];

        if (!child) {
            // Create child node
            const halfWidth = node.width / 2;
            const halfHeight = node.height / 2;
            const childX = quadrant % 2 === 0 ? node.x : node.x + halfWidth;
            const childY = quadrant < 2 ? node.y : node.y + halfHeight;

            const newChild: QuadNode = {
                cx: x,
                cy: y,
                mass,
                x: childX,
                y: childY,
                width: halfWidth,
                height: halfHeight,
                children: [null, null, null, null],
                isLeaf: true,
                leafId: id,
            };
            node.children[quadrant] = newChild;
        } else {
            this.#insertIntoQuadtree(child, id, x, y, mass);
        }
    }

    /**
     * Subdivides a leaf node into four quadrants.
     */
    #subdivide(node: QuadNode): void {
        if (!node.leafId) return;

        const halfWidth = node.width / 2;
        const halfHeight = node.height / 2;

        // Re-insert the existing body
        const existingId = node.leafId;
        const existingX = node.cx;
        const existingY = node.cy;
        const existingMass = node.mass;
        node.leafId = undefined;
        node.isLeaf = false;

        const quadrant = this.#getQuadrant(node, existingX, existingY);
        const childX = quadrant % 2 === 0 ? node.x : node.x + halfWidth;
        const childY = quadrant < 2 ? node.y : node.y + halfHeight;

        node.children[quadrant] = {
            cx: existingX,
            cy: existingY,
            mass: existingMass,
            x: childX,
            y: childY,
            width: halfWidth,
            height: halfHeight,
            children: [null, null, null, null],
            isLeaf: true,
            leafId: existingId,
        };
    }

    /**
     * Determines which quadrant a point belongs to.
     * 0: NW, 1: NE, 2: SW, 3: SE
     */
    #getQuadrant(node: QuadNode, x: number, y: number): number {
        const midX = node.x + node.width / 2;
        const midY = node.y + node.height / 2;
        return (x >= midX ? 1 : 0) + (y >= midY ? 2 : 0);
    }

    /** The points in a uniform grid, so a box only pushes the boxes near it. */
    #bucket(
        points: ReadonlyMap<string, { x: number; y: number }>,
        cell: number,
    ): Map<string, string[]> {
        const cells = new Map<string, string[]>();

        for (const [id, point] of points) {
            const key = `${Math.floor(point.x / cell)}:${Math.floor(point.y / cell)}`;
            const bucket = cells.get(key);

            if (bucket) bucket.push(id);
            else cells.set(key, [id]);
        }

        return cells;
    }

    #neighbours(
        cells: ReadonlyMap<string, string[]>,
        points: ReadonlyMap<string, { x: number; y: number }>,
        id: string,
        cell: number,
    ): string[] {
        const point = points.get(id)!;
        const cx = Math.floor(point.x / cell);
        const cy = Math.floor(point.y / cell);
        const found: string[] = [];

        for (let dx = -1; dx <= 1; dx++)
            for (let dy = -1; dy <= 1; dy++) {
                const bucket = cells.get(`${cx + dx}:${cy + dy}`);

                if (bucket) found.push(...bucket);
            }

        return found;
    }
}