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
}

const DEFAULT_SPACING = 240;
const DEFAULT_ITERATIONS = 300;
const DEFAULT_DEPTH_STEP = 64;

/** The golden angle: it spreads the initial placement without a random number generator. */
const GOLDEN_ANGLE = 2.399963229728653;

/**
 * The force placement: a simulation, not a grid.
 *
 * The session graph's layout contract says "no physics", and the reason is that a live simulation
 * jitters while the session streams. So the simulation is deterministic (a fixed seed, a fixed
 * number of steps, the model's own order) and then frozen: the boxes a layout already placed keep
 * their position, and only the new ones relax against them.
 *
 * The model is Fruchterman–Reingold: the boxes push each other apart, the links pull them
 * together, and every step is capped by a cooling temperature, so the simulation settles instead of
 * oscillating. A short-range collision term keeps two cards from overlapping.
 */
export class ForcePlacement implements Placement<ForceMeta> {
    readonly name = 'force';
    readonly #spacing: number;
    readonly #iterations: number;
    readonly #seed: number;
    readonly #depthStep: number;

    constructor(config: ForceConfig = {}) {
        this.#spacing = config.spacing ?? DEFAULT_SPACING;
        this.#iterations = config.iterations ?? DEFAULT_ITERATIONS;
        this.#seed = config.seed ?? 1;
        this.#depthStep = config.depthStep ?? DEFAULT_DEPTH_STEP;
    }

    place(
        items: readonly PlacementItem<ForceMeta>[],
        previous?: ReadonlyMap<string, Position>,
    ): ReadonlyMap<string, Position> {
        const points = new Map<string, { x: number; y: number }>();
        const pinned = new Set<string>();

        for (const [i, item] of items.entries()) {
            const frozen = previous?.get(item.id);

            if (frozen) {
                points.set(item.id, { x: frozen.x, y: frozen.y });
                pinned.add(item.id);
                continue;
            }

            const angle = (i + this.#seed) * GOLDEN_ANGLE;
            const radius = (this.#spacing * Math.sqrt(i + 1)) / 2;
            points.set(item.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
        }

        const k = this.#spacing;
        const radii = new Map(items.map((item) => [item.id, item.meta?.radius ?? k / 2]));
        const cell = Math.max(...radii.values(), k / 2) * 2;
        const iterations = Math.max(
            60,
            Math.min(this.#iterations, Math.round((9000 * this.#iterations) / (300 * items.length))),
        );

        for (let step = 0; step < iterations; step++) {
            const heat = (k / 2) * (1 - step / iterations);
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

                    // The collision term: two cards never sit on top of each other.
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

        // The cooling ends at rest, so the last overlaps are separated by their own pass: two cards
        // never sit on top of each other.
        for (let pass = 0; pass < 30; pass++) {
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
