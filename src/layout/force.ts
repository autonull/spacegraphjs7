import { ForceCore, type ForceCoreConfig, type ForceMeta } from './force-core';
import type { Placement, PlacementItem, Position } from './placement';

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
    readonly #core: ForceCore;

    constructor(config: ForceCoreConfig = {}) {
        this.#core = new ForceCore(config);
    }

    place(
        items: readonly PlacementItem<ForceMeta>[],
        previous?: ReadonlyMap<string, Position>,
    ): ReadonlyMap<string, Position> {
        // Convert to internal format for ForceCore
        const nodes = items.map(item => ({
            id: item.id,
            position: { x: 0, y: 0, z: 0 },
            width: item.width,
            height: item.height,
            meta: item.meta,
            depth: item.meta?.radius ? undefined : undefined, // depth not in PlacementItem
        }));

        const previousMap = previous ? new Map(previous.entries()) : undefined;
        const pinnedIds = new Set(previousMap?.keys() ?? []);

        this.#core.run(
            nodes,
            (node) => node.meta?.links ?? [],
            (node) => this.#core.getNodeRadius(node),
            (node) => pinnedIds.has(node.id), // pin nodes that have previous positions
            (node, z) => { node.position.z = z; },
            previousMap,
        );

        const positions = new Map<string, Position>();
        for (const node of nodes) {
            positions.set(node.id, {
                x: node.position.x,
                y: node.position.y,
                z: node.position.z,
            });
        }

        return positions;
    }
}