import { LaneLayout, type LaneLayoutConfig } from './LaneLayout';
import type { Placement, PlacementItem, Position } from './placement';

/** The grid's vocabulary: the column and the row a box belongs to. */
export interface GridMeta {
    /** The column the box belongs to; columns advance on X. */
    group?: string;
    /** The row the box belongs to; rows advance on Y. It wins over the lane. */
    row?: number;
    /** The lane the box belongs to; the lane's index defines its row. */
    lane?: string;
    /** An X offset inside the column, for an indented box. */
    indent?: number;
    /** The width the host declares for the column, when it knows it up front. */
    columnWidth?: number;
    /** The item declares an empty column and carries no box: an empty turn still takes its place. */
    empty?: boolean;
}

export interface GridConfig extends LaneLayoutConfig {
    /** The narrowest a column may be. */
    minColumnWidth?: number;
}

/**
 * The grid placement: the first implementation of the seam. It places boxes into columns and rows,
 * and it is append-only by construction — a placed id keeps the position it was given.
 */
export class GridPlacement implements Placement<GridMeta> {
    readonly name = 'grid';
    readonly #layout: LaneLayout;
    readonly #minColumnWidth: number | undefined;
    readonly #declared = new Set<string>();

    constructor(config: GridConfig) {
        this.#layout = new LaneLayout(config);
        this.#minColumnWidth = config.minColumnWidth;
    }

    place(items: readonly PlacementItem<GridMeta>[]): ReadonlyMap<string, Position> {
        let group: string | undefined;

        for (const item of items) {
            const next = item.meta?.group;

            if (next !== group) {
                this.#close(group);
                group = next;

                if (group !== undefined) {
                    const declared = item.meta?.columnWidth;

                    if (declared !== undefined) this.#declared.add(group);
                    this.#layout.open(group, declared);
                }
            }

            if (item.meta?.empty) continue;

            this.#layout.place({
                id: item.id,
                lane: item.meta?.lane,
                row: item.meta?.row,
                group,
                width: item.width,
                indent: item.meta?.indent,
                depth: item.depth,
            });
        }

        this.#close(group);

        return new Map(
            Object.entries(this.#layout.positions).map(([id, [x, y, z]]) => [id, { x, y, z }]),
        );
    }

    /**
     * Close the column. A column the host declared a width for keeps it; a measured one grows to
     * the narrowest the host allows.
     */
    #close(group: string | undefined): void {
        if (group === undefined) return;
        const span = this.#declared.has(group)
            ? undefined
            : Math.max(this.#layout.width(group), this.#minColumnWidth ?? 0);
        this.#layout.close(group, span);
    }
}
