// Generic summary representations: a one-dimensional ribbon (one row per group, its members laid
// out left to right) and a two-dimensional matrix (rows by columns, with packed cells). The core
// owns the packing; the host owns the vocabulary (which row and column a node belongs to) through
// the config.

import type { GraphLayout, LayoutBounds, Position } from '../layout/strategies';

interface RepresentationNode {
    id: string;
    kind: string;
    /** The turn the node belongs to; a turn node owns itself. */
    turnID?: string;
}

interface RepresentationModel<Node extends RepresentationNode = RepresentationNode> {
    nodes: readonly Node[];
    /** The ordered row keys (the host's turns); a node in a row outside this list is not summarised. */
    rows?: readonly string[];
}

interface RepresentationConfig<Node extends RepresentationNode = RepresentationNode> {
    /** The box a node occupies in the summary. */
    nodeSizeFn: (node: Node) => readonly [number, number];
    /** The footprint of a summary cell; sets the row pitch and the minimum column width. */
    cellSize: readonly [number, number];
    /** The row a node belongs to; undefined places the node in the leading root row. */
    rowKeyFn: (node: Node) => string | number | undefined;
    /** The order of the nodes within a row. */
    rowOrderFn: (nodes: readonly Node[]) => Node[];
    /** The column a node belongs to. */
    columnKeyFn: (node: Node) => number;
    /** The nodes that participate in the summary. */
    levelFilter?: (node: Node) => boolean;
    /** The column index to label, for axis generation. */
    categoryMap?: Readonly<Record<number, string>>;
}

interface RepresentationOptions {
    /** The horizontal distance between adjacent segments and cells. */
    gap?: number;
    /** The vertical distance between rows. */
    rowGap?: number;
}

const ZERO_BOUNDS: LayoutBounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };

/**
 * The rows of a summary: the root row first (the nodes without a row of their own), then one row
 * per row key in the model's order. Within a row the host orders the nodes.
 */
function summaryRows<Node extends RepresentationNode>(
    model: RepresentationModel<Node>,
    config: RepresentationConfig<Node>,
): Node[][] {
    const root: Node[] = [];
    const byRow = new Map<string, Node[]>();

    for (const node of model.nodes) {
        if (config.levelFilter && !config.levelFilter(node)) continue;

        const key = config.rowKeyFn(node);

        if (key === undefined) {
            root.push(node);
            continue;
        }

        const bucket = byRow.get(String(key));

        if (bucket) bucket.push(node);
        else byRow.set(String(key), [node]);
    }

    const rows: Node[][] = [];

    if (root.length > 0) rows.push(config.rowOrderFn(root));

    for (const key of model.rows ?? []) {
        const nodes = byRow.get(key);

        if (nodes && nodes.length > 0) rows.push(config.rowOrderFn(nodes));
    }

    return rows;
}

/**
 * The ribbon: one horizontal bar per row, its members laid out left to right as segments. A row
 * that revisits a category keeps its distinct runs, so the ribbon shows the real rhythm instead of
 * a single flattened bar.
 */
function ribbonLayout<Node extends RepresentationNode>(
    model: RepresentationModel<Node>,
    config: RepresentationConfig<Node>,
    options: RepresentationOptions = {},
): GraphLayout {
    const gap = options.gap ?? 24;
    const rowGap = options.rowGap ?? 20;
    const rowHeight = config.cellSize[1] + rowGap;
    const positions = new Map<string, Position>();

    summaryRows(model, config).forEach((nodes, index) => {
        let cursor = 0;

        for (const node of nodes) {
            // Use the node's real footprint: a wide node would overlap its neighbour on a fixed stride.
            const width = config.nodeSizeFn(node)[0];
            positions.set(node.id, { x: cursor + width / 2, y: index * rowHeight, z: 0 });
            cursor += width + gap;
        }
    });

    return { positions, clusters: new Map(), bounds: boundsOf(positions), strategy: 'lanes' };
}

/**
 * The matrix: rows by columns, so "which column dominated a row" reads at a glance. Each node
 * lands in its (row, column) cell; a cell with several occupants fans them within the cell rather
 * than dropping one.
 */
function matrixLayout<Node extends RepresentationNode>(
    model: RepresentationModel<Node>,
    config: RepresentationConfig<Node>,
    options: RepresentationOptions = {},
): GraphLayout {
    const gap = options.gap ?? 24;
    const rowGap = options.rowGap ?? 20;
    const rowHeight = config.cellSize[1] + rowGap;
    const positions = new Map<string, Position>();
    const rows = summaryRows(model, config);

    const cells = new Map<string, Node[]>();

    rows.forEach((nodes, row) => {
        for (const node of nodes) {
            const key = `${row}:${config.columnKeyFn(node)}`;
            cells.set(key, [...(cells.get(key) ?? []), node]);
        }
    });

    const columnWidth = new Map<number, number>();

    for (const [key, nodes] of cells) {
        const column = Number(key.slice(key.indexOf(':') + 1));
        const cellWidth =
            nodes.reduce((total, node) => total + config.nodeSizeFn(node)[0] + gap, 0) - gap;
        columnWidth.set(column, Math.max(columnWidth.get(column) ?? config.cellSize[0], cellWidth));
    }

    const columnX = (column: number) => {
        let x = 0;

        for (let index = 0; index < column; index++) x += (columnWidth.get(index) ?? config.cellSize[0]) + gap;

        return x;
    };

    for (const [key, nodes] of cells) {
        const separator = key.indexOf(':');
        const row = Number(key.slice(0, separator));
        const column = Number(key.slice(separator + 1));
        let cursor = columnX(column);

        for (const node of nodes) {
            const width = config.nodeSizeFn(node)[0];
            positions.set(node.id, { x: cursor + width / 2, y: row * rowHeight, z: 0 });
            cursor += width + gap;
        }
    }

    return { positions, clusters: new Map(), bounds: boundsOf(positions), strategy: 'lanes' };
}

/** The labelled columns of a matrix, for axis generation. */
function summaryColumns<Node extends RepresentationNode>(
    config: RepresentationConfig<Node>,
): { column: number; label: string }[] {
    return Object.entries(config.categoryMap ?? {}).map(([column, label]) => ({
        column: Number(column),
        label,
    }));
}

function boundsOf(positions: ReadonlyMap<string, Position>): LayoutBounds {
    const points = [...positions.values()];

    if (points.length === 0) return ZERO_BOUNDS;

    return {
        min: {
            x: Math.min(...points.map((point) => point.x)),
            y: Math.min(...points.map((point) => point.y)),
            z: 0,
        },
        max: {
            x: Math.max(...points.map((point) => point.x)),
            y: Math.max(...points.map((point) => point.y)),
            z: 0,
        },
    };
}

/** The summary representation API. A host calls it with its own node vocabulary. */
export const Representations = {
    summaryRows,
    ribbonLayout,
    matrixLayout,
    summaryColumns,
};

export type {
    RepresentationConfig,
    RepresentationModel,
    RepresentationNode,
    RepresentationOptions,
};
