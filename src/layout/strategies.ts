// Generic layout strategies: deterministic, append-only placement of nodes in a lanes band, a
// chronological timeline, and a hierarchical outline. The core owns the geometry; the host owns the
// vocabulary (box sizes, lane names, depths, turn grouping) through the config.
//
// The three strategies are policies over one primitive: `LaneLayout` places items into columns and
// rows, and a strategy decides which column and row an item belongs to. Nothing here measures a
// card.

import { LaneLayout } from './LaneLayout';

type Position = { x: number; y: number; z: number };

type LayoutBounds = { min: Position; max: Position };

type LayoutStrategy = 'lanes' | 'timeline' | 'hierarchy';

const LAYOUT_STRATEGIES: readonly LayoutStrategy[] = ['lanes', 'timeline', 'hierarchy'];

interface LayoutNode {
    id: string;
    kind: string;
    /** The turn the node belongs to; a turn node owns itself. */
    turnID?: string;
    /** The members of a derived cluster chip. */
    clusterOf?: readonly string[];
}

interface LayoutEdge {
    id: string;
    source: string;
    target: string;
    kind: string;
}

interface LayoutModel<Node extends LayoutNode = LayoutNode, Edge extends LayoutEdge = LayoutEdge> {
    nodes: readonly Node[];
    edges: readonly Edge[];
    /** The id of the root node. */
    root: string;
    /** The ids of the turns, in order. */
    turns: readonly string[];
}

interface LayoutGeometry {
    /** The footprint of a standard node box. */
    standardSize: readonly [number, number];
    /** The horizontal indent per hierarchy depth. */
    indentStep: number;
    /** The number of hierarchy depth levels. */
    depthLevels: number;
    /** The extra room around a turn column. */
    padding: number;
}

interface LayoutConfig<
    Node extends LayoutNode = LayoutNode,
    Edge extends LayoutEdge = LayoutEdge,
    Name extends string = string,
> {
    /** The box a node occupies. */
    nodeSizeFn: (node: Node) => readonly [number, number];
    /** The ordered lane names. */
    laneList: readonly Name[];
    /** The lane a node belongs to. */
    laneOfFn: (node: Node) => Name;
    /** The depth of a node kind. */
    depthMap: Readonly<Record<string, number>>;
    /** The turn a node belongs to; a turn node owns itself. */
    turnIdFn: (node: Node) => string | undefined;
    /** The turn that owns a node with no turn of its own. */
    ownerTurnFn?: (model: LayoutModel<Node, Edge>, node: Node) => string | undefined;
    /** The members of a derived cluster chip; undefined when the node is not a cluster. */
    clusterOfFn?: (node: Node) => readonly string[] | undefined;
    /** The measurements the strategies lay out against. */
    geometry: LayoutGeometry;
}

interface LayoutOptions<Node extends LayoutNode = LayoutNode> {
    strategy?: LayoutStrategy;
    /** The horizontal distance between adjacent nodes in a lane. */
    gap?: number;
    /** The vertical distance between lanes. */
    laneGap?: number;
    /** The horizontal distance between turn columns. */
    turnGap?: number;
    /** The Z distance between hierarchy depths. */
    depthStep?: number;
    /** The cards per wrapped row before a turn's block folds to the next row. */
    columns?: number;
    /** The vertical distance between rows. */
    rowGap?: number;
    /** The rows per column before the outline wraps into the next column. */
    rows?: number;
    /** Restricts the nodes the lanes layout places. */
    include?: (node: Node) => boolean;
    /** Overrides the minimum width of a turn column in the lanes layout. */
    minColumnWidth?: number;
}

interface GraphLayout {
    positions: ReadonlyMap<string, Position>;
    clusters: Map<string, LayoutBounds>;
    bounds: LayoutBounds;
    strategy: LayoutStrategy;
}

const ZERO_BOUNDS: LayoutBounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };

/** The column the session's own nodes share, before the first turn's column. */
const SESSION_COLUMN = '__session__';

function lookup<Key extends string, Value>(
    record: Readonly<Record<Key, Value>>,
    key: string,
): Value | undefined {
    return (record as Readonly<Record<string, Value | undefined>>)[key];
}

function depthOf(depthMap: Readonly<Record<string, number>>, kind: string): number {
    return lookup(depthMap, kind) ?? 0;
}

function boundsOf(points: readonly Position[]): LayoutBounds {
    const [first, ...rest] = points;
    const seed = { x: first!.x, y: first!.y, z: first!.z };

    return rest.reduce(
        (acc, point) => ({
            min: {
                x: Math.min(acc.min.x, point.x),
                y: Math.min(acc.min.y, point.y),
                z: Math.min(acc.min.z, point.z),
            },
            max: {
                x: Math.max(acc.max.x, point.x),
                y: Math.max(acc.max.y, point.y),
                z: Math.max(acc.max.z, point.z),
            },
        }),
        { min: { ...seed }, max: { ...seed } },
    );
}

/** The bounds over the placed positions of a set of node ids; undefined when none are placed. */
function memberPositions(
    ids: readonly string[] | undefined,
    positions: ReadonlyMap<string, Position>,
): LayoutBounds | undefined {
    const members = (ids ?? []).flatMap((id) => {
        const position = positions.get(id);

        return position ? [position] : [];
    });

    return members.length > 0 ? boundsOf(members) : undefined;
}

/** The placed positions of a layout, as the map the bands and the bounds are read from. */
function placedPositions(layout: LaneLayout): Map<string, Position> {
    return new Map(
        Object.entries(layout.positions).map(([id, [x, y, z]]) => [id, { x, y, z }]),
    );
}

/**
 * The nodes of a model bucketed by the turn they belong to, in model order. A layout that filtered
 * the whole node list once per turn was quadratic, and a long session paid for it (T6.6): one pass
 * builds the buckets, and every turn reads its own.
 */
function nodesByTurn<Node extends LayoutNode, Edge extends LayoutEdge, Name extends string>(
    model: LayoutModel<Node, Edge>,
    config: LayoutConfig<Node, Edge, Name>,
): Map<string, Node[]> {
    const byTurn = new Map<string, Node[]>();

    for (const node of model.nodes) {
        const turn = config.turnIdFn(node);

        if (!turn) continue;

        const bucket = byTurn.get(turn);

        if (bucket) bucket.push(node);
        else byTurn.set(turn, [node]);
    }

    return byTurn;
}

/**
 * The members of a turn's column: the nodes the turn owns, in model order, with the turn node
 * itself included even when it does not name its own turn.
 */
function turnColumnNodes<Node extends LayoutNode>(
    members: readonly Node[],
    turnID: string,
    order: ReadonlyMap<string, number>,
    model: { nodes: readonly Node[] },
): Node[] {
    const turnIndex = order.get(turnID);

    if (turnIndex === undefined) return [...members];

    const turnNode = model.nodes[turnIndex]!;

    if (members.some((node) => node.id === turnID)) return [...members];

    const merged = [...members];
    const at = merged.findIndex((node) => (order.get(node.id) ?? 0) > turnIndex);

    merged.splice(at < 0 ? merged.length : at, 0, turnNode);

    return merged;
}

/**
 * The chronological blocks shared by the timeline and the hierarchy: the root group first (the
 * root and any node without an owning turn), then one block per turn with its header leading its
 * members in model order.
 */
function turnBlocks<Node extends LayoutNode, Edge extends LayoutEdge, Name extends string>(
    model: LayoutModel<Node, Edge>,
    config: LayoutConfig<Node, Edge, Name>,
): Node[][] {
    const global: Node[] = [];
    const byTurn = new Map<string, Node[]>();

    for (const node of model.nodes) {
        const key = config.turnIdFn(node);

        if (!key) {
            global.push(node);
            continue;
        }

        const bucket = byTurn.get(key);

        if (bucket) bucket.push(node);
        else byTurn.set(key, [node]);
    }

    const blocks: Node[][] = [];

    if (global.length > 0) blocks.push(global);

    for (const turnID of model.turns) {
        const nodes = byTurn.get(turnID);

        if (nodes && nodes.length > 0) blocks.push(nodes);
    }

    return blocks;
}

/**
 * Lanes: the session column, then one column per turn whose width is its own widest lane. Y is the
 * semantic activity lane, so the lanes read as horizontal bands.
 */
function lanesLayout<Node extends LayoutNode, Edge extends LayoutEdge, Name extends string>(
    model: LayoutModel<Node, Edge>,
    config: LayoutConfig<Node, Edge, Name>,
    options: LayoutOptions<Node>,
): GraphLayout {
    const gap = options.gap ?? 24;
    const laneGap = options.laneGap ?? 24;
    const turnGap = options.turnGap ?? 96;
    const depthStep = options.depthStep ?? 64;
    const laneHeight = config.geometry.standardSize[1] + laneGap;
    const minColumnWidth = options.minColumnWidth ?? config.geometry.standardSize[0];

    const layout = new LaneLayout({
        lanes: config.laneList,
        lanePitch: laneHeight,
        step: gap,
        groupGap: turnGap,
        depthStep,
    });

    // A host that draws a subset (a level, a lens) restricts the nodes that consume space.
    const nodes = options.include ? model.nodes.filter(options.include) : model.nodes;

    const owners = new Map<string, string>();

    for (const node of nodes) {
        const owner = config.ownerTurnFn?.(model, node);

        if (owner) owners.set(node.id, owner);
    }

    // One pass over the visible nodes builds the session column and the per-turn buckets.
    // Filtering the whole node list once per turn was quadratic, and a long session paid for it
    // (T6.6). A node that names both a turn and an owner belongs to the owner's column: it is
    // anchored there, so that is where it is drawn.
    const byTurn = new Map<string, Node[]>();
    const sessionColumn: Node[] = [];

    for (const node of nodes) {
        const turn = config.turnIdFn(node);
        const owner = owners.get(node.id);
        const column =
            node.id === model.root ? SESSION_COLUMN : (owner ?? turn ?? SESSION_COLUMN);

        if (column === SESSION_COLUMN) {
            sessionColumn.push(node);
            continue;
        }

        const bucket = byTurn.get(column);

        if (bucket) bucket.push(node);
        else byTurn.set(column, [node]);
    }

    // Every turn is a column, including an empty one: the column is the turn's place in the
    // session, and a session does not close the gap of a turn that drew nothing.
    const columns: [string, Node[]][] = [];

    if (sessionColumn.length > 0) columns.push([SESSION_COLUMN, sessionColumn]);

    for (const turnID of model.turns) columns.push([turnID, byTurn.get(turnID) ?? []]);

    for (const [column, members] of columns) {
        layout.open(column);

        for (const node of members)
            layout.place({
                id: node.id,
                lane: config.laneOfFn(node),
                group: column,
                width: config.nodeSizeFn(node)[0],
                depth: depthOf(config.depthMap, node.kind),
            });

        layout.close(column, Math.max(layout.width(column), minColumnWidth));
    }

    const positions = placedPositions(layout);
    const clusters = new Map<string, LayoutBounds>();

    // Derived clusters keep their membership order; their bounds drive the host's bands.
    for (const node of model.nodes) {
        const members = config.clusterOfFn?.(node);

        if (!members) continue;

        const bounds = memberPositions(members, positions);

        if (bounds) clusters.set(node.id, bounds);
    }

    // Turn bands span all of a turn's members and the turn node itself.
    const allByTurn = nodesByTurn(model, config);

    for (const turnID of model.turns) {
        const members = memberPositions(
            [turnID, ...(allByTurn.get(turnID) ?? []).map((node) => node.id)],
            positions,
        );

        if (members) clusters.set(turnID, members);
    }

    const all = [...positions.values()];

    return {
        positions,
        clusters,
        bounds: all.length > 0 ? boundsOf(all) : ZERO_BOUNDS,
        strategy: 'lanes',
    };
}

/**
 * Timeline: chronological left-to-right flow. Each turn is a column band with its members laid out
 * vertically within it. Reading order is clear: time flows left-to-right, activity stacks
 * top-to-bottom within each turn.
 */
function timelineLayout<Node extends LayoutNode, Edge extends LayoutEdge, Name extends string>(
    model: LayoutModel<Node, Edge>,
    config: LayoutConfig<Node, Edge, Name>,
    options: LayoutOptions<Node>,
): GraphLayout {
    const gap = options.gap ?? 24;
    const rowGap = options.rowGap ?? 20;
    const depthStep = options.depthStep ?? 64;
    const columns = Math.max(1, options.columns ?? 6);
    const rowHeight = config.geometry.standardSize[1] + rowGap;
    // Horizontal space per turn column: max cards per column * (card width + gap) + band padding
    const turnColumnWidth =
        columns * (config.geometry.standardSize[0] + gap) + config.geometry.padding;

    const layout = new LaneLayout({ lanePitch: rowHeight, step: gap, groupGap: 0, depthStep });

    // The leading block (the root group, or the first turn when the model has none) opens the timeline.
    const [leading] = turnBlocks(model, config);

    if (leading && leading.length > 0) {
        layout.open(SESSION_COLUMN, turnColumnWidth);

        for (let i = 0; i < leading.length; i += columns) {
            const row = Math.floor(i / columns);

            for (const node of leading.slice(i, i + columns))
                layout.place({
                    id: node.id,
                    row,
                    group: SESSION_COLUMN,
                    width: config.nodeSizeFn(node)[0],
                    depth: depthOf(config.depthMap, node.kind),
                });
        }

        layout.close(SESSION_COLUMN);
    }

    // Each turn gets its own column band. The members come from one pass over the model, not one
    // filter per turn (T6.6).
    const byTurn = nodesByTurn(model, config);
    const order = new Map(model.nodes.map((node, index) => [node.id, index]));
    const columnsByTurn = new Map<string, Node[]>();

    for (const turnID of model.turns) {
        const turnNodes = turnColumnNodes(byTurn.get(turnID) ?? [], turnID, order, model);

        if (turnNodes.length === 0) continue;

        columnsByTurn.set(turnID, turnNodes);

        layout.open(turnID, turnColumnWidth);

        for (let i = 0; i < turnNodes.length; i += columns) {
            const row = Math.floor(i / columns);

            for (const node of turnNodes.slice(i, i + columns))
                layout.place({
                    id: node.id,
                    row,
                    group: turnID,
                    width: config.nodeSizeFn(node)[0],
                    depth: depthOf(config.depthMap, node.kind),
                });
        }

        layout.close(turnID);
    }

    const positions = placedPositions(layout);
    const clusters = new Map<string, LayoutBounds>();

    // The root band spans the leading block
    if (leading && leading.length > 0) {
        const members = memberPositions(
            [model.root, ...leading.map((node) => node.id)],
            positions,
        );

        if (members) clusters.set('session', members);
    }

    // Turn band spans this turn's column
    for (const turnID of model.turns) {
        const turnNodes = columnsByTurn.get(turnID);

        if (!turnNodes) continue;

        const members = memberPositions(
            [turnID, ...turnNodes.filter((node) => node.id !== turnID).map((node) => node.id)],
            positions,
        );

        if (members) clusters.set(turnID, members);
    }

    // Derived clusters
    for (const node of model.nodes) {
        const members = config.clusterOfFn?.(node);

        if (!members) continue;

        const bounds = memberPositions(members, positions);

        if (bounds) clusters.set(node.id, bounds);
    }

    const all = [...positions.values()];

    return {
        positions,
        clusters,
        bounds: all.length > 0 ? boundsOf(all) : ZERO_BOUNDS,
        strategy: 'timeline',
    };
}

/**
 * Hierarchy: a left-to-right indented outline. Depth reads as X offset (ancestry is a staircase),
 * rows wrap within a capped column height so cards stay legible, and the user pans instead of
 * zooming below the legibility floor. Positions are deterministic and append-only.
 */
function hierarchyLayout<Node extends LayoutNode, Edge extends LayoutEdge, Name extends string>(
    model: LayoutModel<Node, Edge>,
    config: LayoutConfig<Node, Edge, Name>,
    options: LayoutOptions<Node>,
): GraphLayout {
    const rowGap = options.rowGap ?? 12;
    const depthStep = options.depthStep ?? 64;
    const rowHeight = config.geometry.standardSize[1] + rowGap;
    // Cap column height to keep card text above the legibility floor.
    const rowsPerColumn = Math.max(1, options.rows ?? 14);
    const indentStep = config.geometry.indentStep;
    // Column width accommodates the deepest indent, the card width, and the padding.
    const columnWidth =
        indentStep * config.geometry.depthLevels +
        config.geometry.standardSize[0] +
        config.geometry.padding;

    const layout = new LaneLayout({ lanePitch: rowHeight, step: options.gap ?? 24, groupGap: 0, depthStep });
    let column = 0;

    for (const nodes of turnBlocks(model, config)) {
        let row = 0;
        let group = `column:${column}`;

        layout.open(group, columnWidth);

        for (const node of nodes) {
            if (row >= rowsPerColumn) {
                layout.close(group);
                row = 0;
                column += 1;
                group = `column:${column}`;
                layout.open(group, columnWidth);
            }

            const depth = depthOf(config.depthMap, node.kind);

            layout.place({
                id: node.id,
                row,
                group,
                indent: depth * indentStep,
                width: config.geometry.standardSize[0],
                depth,
            });
            row += 1;
        }

        layout.close(group);
        column += 1;
    }

    const positions = placedPositions(layout);
    const all = [...positions.values()];

    return {
        positions,
        clusters: new Map(),
        bounds: all.length > 0 ? boundsOf(all) : ZERO_BOUNDS,
        strategy: 'hierarchy',
    };
}

/** Lays a model out with the requested strategy. */
function layoutGraph<Node extends LayoutNode, Edge extends LayoutEdge, Name extends string>(
    model: LayoutModel<Node, Edge>,
    config: LayoutConfig<Node, Edge, Name>,
    options: LayoutOptions<Node> = {},
): GraphLayout {
    const strategy = options.strategy ?? 'lanes';

    if (strategy === 'hierarchy') return hierarchyLayout(model, config, options);

    if (strategy === 'timeline') return timelineLayout(model, config, options);

    return lanesLayout(model, config, options);
}

/** The vertical centre of each lane, for a lane-label overlay aligned to the lanes layout. */
function laneAnchors<
    Node extends LayoutNode,
    Edge extends LayoutEdge,
    Name extends string,
>(
    config: LayoutConfig<Node, Edge, Name>,
    options: LayoutOptions<Node> = {},
): { name: Name; y: number }[] {
    const laneGap = options.laneGap ?? 24;
    const laneHeight = config.geometry.standardSize[1] + laneGap;

    return config.laneList.map((name, index) => ({ name, y: index * laneHeight }));
}

/** The layout strategy API. A host calls it with its own node vocabulary. */
export const Strategies = {
    LAYOUT_STRATEGIES,
    layoutGraph,
    laneAnchors,
};

export type {
    GraphLayout,
    LayoutBounds,
    LayoutConfig,
    LayoutEdge,
    LayoutGeometry,
    LayoutModel,
    LayoutNode,
    LayoutOptions,
    LayoutStrategy,
    Position,
};
