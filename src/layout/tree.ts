import type { Placement, PlacementItem, Position } from './placement';

/** The tree's vocabulary: the parent a box hangs from. */
export interface TreeMeta {
    /** The parent box's id; undefined for a root. */
    parent?: string;
}

export interface TreeConfig {
    /** The horizontal distance between two columns. */
    columnPitch?: number;
    /** The vertical distance between two rows. */
    rowPitch?: number;
    /** The Z distance per depth. */
    depthStep?: number;
    /** The leaves a row holds before a block folds to the next row. */
    columns?: number;
}

const DEFAULT_COLUMN_PITCH = 260;
const DEFAULT_ROW_PITCH = 96;
const DEFAULT_DEPTH_STEP = 64;
const DEFAULT_COLUMNS = 4;

/** The block a subtree occupies: its width, its height in rows, and where its children sit. */
interface Block {
    /** The block's width. */
    width: number;
    /** The block's height, in rows, the node's own row included. */
    rows: number;
    /** The grid row the node's children start at, relative to the node's row. */
    firstRow: number;
    /** The grid rows of the block: their offset from the node's row and their height. */
    rows2: { offset: number; height: number }[];
}

/**
 * The tree placement: a box hangs under its parent, the tree grows downward, and a parent sits over
 * the middle of its children.
 *
 * A classic tidy tree re-centres a parent when a child is appended, which would move a node the
 * reader is looking at. So a placed box keeps its column: the engine reads the positions the layout
 * already assigned (`previous`), and only the boxes it has not seen take a new slot — the next free
 * one, next to their parent when there is room.
 *
 * The leaves of a parent are packed into a block of rows, so a session's work reads as a block under
 * its turn instead of a fan that no frame can hold.
 */
export class TreePlacement implements Placement<TreeMeta> {
    readonly name = 'tree';
    readonly #columnPitch: number;
    readonly #rowPitch: number;
    readonly #depthStep: number;
    readonly #columns: number;

    constructor(config: TreeConfig = {}) {
        this.#columnPitch = config.columnPitch ?? DEFAULT_COLUMN_PITCH;
        this.#rowPitch = config.rowPitch ?? DEFAULT_ROW_PITCH;
        this.#depthStep = config.depthStep ?? DEFAULT_DEPTH_STEP;
        this.#columns = Math.max(1, config.columns ?? DEFAULT_COLUMNS);
    }

    place(
        items: readonly PlacementItem<TreeMeta>[],
        previous?: ReadonlyMap<string, Position>,
    ): ReadonlyMap<string, Position> {
        const byID = new Map(items.map((item) => [item.id, item]));
        const children = new Map<string, string[]>();

        for (const item of items) {
            const parent = item.meta?.parent;

            if (!parent || !byID.has(parent)) continue;
            const siblings = children.get(parent);

            if (siblings) siblings.push(item.id);
            else children.set(parent, [item.id]);
        }

        const blocks = new Map<string, Block>();
        const cells = new Map<string, { row: number; column: number; width: number }>();
        const depths = new Map(items.map((item) => [item.id, item.depth ?? 0]));

        for (const item of items) this.#measure(item.id, children, blocks, cells);

        const positions = new Map<string, Position>();
        const roots = items.filter((item) => {
            const parent = item.meta?.parent;

            return !parent || !byID.has(parent);
        });

        let cursor = 0;

        for (const root of roots) {
            const block = blocks.get(root.id)!;
            const centre = cursor + block.width / 2;

            this.#place(root.id, centre, 0, children, blocks, cells, depths, positions, previous);
            cursor += block.width;
        }

        return positions;
    }

    /**
     * The size of a node's block, bottom up: a leaf is one cell, and a parent is its children's
     * blocks side by side, packed into rows.
     */
    #measure(
        id: string,
        children: ReadonlyMap<string, string[]>,
        blocks: Map<string, Block>,
        cells: Map<string, { row: number; column: number; width: number }>,
    ): void {
        const kids = children.get(id) ?? [];

        if (kids.length === 0) {
            blocks.set(id, { width: this.#columnPitch, rows: 1, firstRow: 0, rows2: [] });
            return;
        }

        for (const kid of kids) this.#measure(kid, children, blocks, cells);

        const widths = kids.map((kid) => blocks.get(kid)!.width);
        const cellWidth = Math.max(...widths);
        const perRow = Math.min(this.#columns, kids.length);
        const gridRows: { offset: number; height: number }[] = [];
        let height = 0;

        kids.forEach((kid, index) => {
            const row = Math.floor(index / perRow);
            const block = blocks.get(kid)!;

            if (!gridRows[row]) gridRows[row] = { offset: height, height: block.rows };
            else gridRows[row].height = Math.max(gridRows[row].height, block.rows);

            cells.set(kid, { row, column: index % perRow, width: cellWidth });
            height = gridRows[row].offset + gridRows[row].height;
        });

        blocks.set(id, {
            width: Math.max(perRow * cellWidth, this.#columnPitch),
            rows: 1 + height,
            firstRow: 1,
            rows2: gridRows,
        });
    }

    /** The absolute position of a node and of everything under it. */
    #place(
        id: string,
        centre: number,
        y: number,
        children: ReadonlyMap<string, string[]>,
        blocks: ReadonlyMap<string, Block>,
        cells: ReadonlyMap<string, { row: number; column: number; width: number }>,
        depths: ReadonlyMap<string, number>,
        positions: Map<string, Position>,
        previous: ReadonlyMap<string, Position> | undefined,
    ): void {
        const frozen = previous?.get(id);
        const block = blocks.get(id)!;
        const x = frozen ? frozen.x : centre;
        const row = frozen ? -frozen.y / this.#rowPitch : y;

        positions.set(id, {
            x,
            // The tree grows downward: the root is the highest point, the work is below it.
            y: -row * this.#rowPitch || 0,
            z: (depths.get(id) ?? 0) * this.#depthStep,
        });

        const kids = children.get(id) ?? [];

        if (kids.length === 0) return;

        const start = x - block.width / 2;

        for (const kid of kids) {
            const cell = cells.get(kid)!;
            const row = block.rows2[cell.row];
            this.#place(
                kid,
                start + cell.column * cell.width + cell.width / 2,
                y + row.offset + 1,
                children,
                blocks,
                cells,
                depths,
                positions,
                previous,
            );
        }
    }
}
