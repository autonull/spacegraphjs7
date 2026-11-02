// Generic lane layout: deterministic, append-only placement of items into columns and rows. No
// renderer, session, or contract dependency. Hosts layer semantics (turns, phases, event
// ordinals) on top; this only owns geometry.
//
// A layout is a grid: columns advance on X, rows advance on Y. A column is a horizontal band (a
// turn, an outline block); a row is a lane inside it. Every (column, row) cell keeps its own
// cursor, so a lane advances by the widths of the items it holds while its neighbours stay put.
// A column's width is measured from the rows it holds, or declared when the host knows it up front.

export type LaneLayoutPosition = [number, number, number];

export interface LaneLayoutConfig {
    /** Ordered lane ids; a lane's index defines its row. */
    lanes?: readonly string[];
    /** The Y distance between rows. */
    lanePitch?: number;
    /** The X distance between adjacent items in a row. */
    step?: number;
    /** The X distance between columns. */
    groupGap?: number;
    /** The Z distance per hierarchy depth. */
    depthStep?: number;
    /** The lane used when an item names an unknown or missing lane. */
    defaultLane?: string;
}

export interface LaneItem {
    id: string;
    /** The lane the item belongs to; the lane's index defines its row. */
    lane?: string;
    /** The row index, when the host numbers its rows itself. It wins over the lane. */
    row?: number;
    /** The column the item belongs to; columns advance on X. */
    group?: string;
    /** The box the item occupies; the cell's cursor advances by its width plus the gap. */
    width?: number;
    /** An X offset inside the column, for an indented item. */
    indent?: number;
    /** The hierarchy depth recorded in Z. */
    depth?: number;
}

export interface LaneBounds {
    min: LaneLayoutPosition;
    max: LaneLayoutPosition;
    center: LaneLayoutPosition;
    size: LaneLayoutPosition;
}

const DEFAULT_GROUP = '__default__';

export class LaneLayout {
    readonly #lanes: readonly string[];
    readonly #lanePitch: number;
    readonly #step: number;
    readonly #groupGap: number;
    readonly #depthStep: number;
    readonly #defaultLane: string;
    readonly #positions: Record<string, LaneLayoutPosition> = {};
    readonly #columnBase: Record<string, number> = {};
    readonly #columnSpan: Record<string, number> = {};
    readonly #cellCursor: Record<string, number> = {};
    readonly #columnExtent: Record<string, number> = {};
    #nextColumnX = 0;

    constructor(config: LaneLayoutConfig) {
        this.#lanes = config.lanes ?? [];
        this.#lanePitch = config.lanePitch ?? 56;
        this.#step = config.step ?? 48;
        this.#groupGap = config.groupGap ?? 320;
        this.#depthStep = config.depthStep ?? 64;
        this.#defaultLane = config.defaultLane ?? this.#lanes[0] ?? DEFAULT_GROUP;
    }

    get positions(): Readonly<Record<string, LaneLayoutPosition>> {
        return this.#positions;
    }

    get lanes(): readonly string[] {
        return this.#lanes;
    }

    /**
     * Assign a position for `item`, once. Re-placing a known id returns the stored position, so
     * graph mutations never move earlier items. The position is the item's centre: the renderer
     * places boxes on their centre.
     */
    place(item: LaneItem): LaneLayoutPosition {
        const placed = this.#positions[item.id];
        if (placed) return placed;

        const group = item.group ?? DEFAULT_GROUP;
        const base = this.#baseOf(group);
        const width = item.width ?? 0;
        const indent = item.indent ?? 0;
        const row = this.#rowOf(item);
        const cell = `${group} ${row}`;
        const cursor = this.#cellCursor[cell] ?? base;

        const position: LaneLayoutPosition = [
            cursor + indent + width / 2,
            row * this.#lanePitch,
            (item.depth ?? 0) * this.#depthStep,
        ];

        this.#positions[item.id] = position;
        this.#cellCursor[cell] = cursor + width + this.#step;
        this.#columnExtent[group] = Math.max(
            this.#columnExtent[group] ?? 0,
            cursor + indent + width - base,
        );

        return position;
    }

    placeAll(items: readonly LaneItem[]): Readonly<Record<string, LaneLayoutPosition>> {
        for (const item of items) this.place(item);
        return this.#positions;
    }

    /** Open a column where the previous one ended, and declare its width when the host knows it. */
    open(group: string, span?: number): void {
        this.#baseOf(group);
        if (span !== undefined) this.#columnSpan[group] = span;
    }

    /** Close a column: the next one starts after it. The width is the declared one, or the measured. */
    close(group: string, span?: number): void {
        const base = this.#baseOf(group);
        const width = span ?? this.#columnSpan[group] ?? this.#columnExtent[group] ?? 0;
        this.#columnSpan[group] = width;
        this.#nextColumnX = base + width + this.#groupGap;
    }

    /** The width of a column: the declared one, or the widest row it holds. */
    width(group: string): number {
        return this.#columnSpan[group] ?? this.#columnExtent[group] ?? 0;
    }

    bounds(ids?: readonly string[]): LaneBounds | undefined {
        const points = (ids ?? Object.keys(this.#positions))
            .map((id) => this.#positions[id])
            .filter((p): p is LaneLayoutPosition => p !== undefined);
        if (!points.length) return undefined;
        const min: LaneLayoutPosition = [Infinity, Infinity, Infinity];
        const max: LaneLayoutPosition = [-Infinity, -Infinity, -Infinity];
        for (const point of points) {
            for (let i = 0; i < 3; i++) {
                min[i] = Math.min(min[i], point[i]);
                max[i] = Math.max(max[i], point[i]);
            }
        }
        const center = [0, 1, 2].map((i) => (min[i] + max[i]) / 2) as LaneLayoutPosition;
        const size = [0, 1, 2].map((i) => max[i] - min[i]) as LaneLayoutPosition;
        return { min, max, center, size };
    }

    clear(): void {
        const records: Record<string, unknown>[] = [
            this.#positions,
            this.#columnBase,
            this.#columnSpan,
            this.#cellCursor,
            this.#columnExtent,
        ];
        for (const record of records) {
            for (const key of Object.keys(record)) delete record[key];
        }
        this.#nextColumnX = 0;
    }

    #rowOf(item: LaneItem): number {
        if (item.row !== undefined) return item.row;
        const index = this.#lanes.indexOf(item.lane ?? this.#defaultLane);
        if (index >= 0) return index;
        return Math.max(this.#lanes.indexOf(this.#defaultLane), 0);
    }

    #baseOf(group: string): number {
        const base = this.#columnBase[group];
        if (base !== undefined) return base;
        this.#columnBase[group] = this.#nextColumnX;
        return this.#nextColumnX;
    }
}
