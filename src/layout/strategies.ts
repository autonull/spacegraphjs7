// Generic layout strategies: deterministic, append-only placement of nodes in a lanes band, a
// chronological timeline, and a hierarchical outline. The core owns the geometry; the host owns the
// vocabulary (box sizes, lane names, depths, turn grouping) through the config.

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

    const positions = new Map<string, Position>();

    // A host that draws a subset (a level, a lens) restricts the nodes that consume space.
    const nodes = options.include ? model.nodes.filter(options.include) : model.nodes;

    const yFor = (node: Node) => config.laneList.indexOf(config.laneOfFn(node)) * laneHeight;

    const place = (node: Node, x: number) =>
        positions.set(node.id, { x, y: yFor(node), z: depthOf(config.depthMap, node.kind) * depthStep });

    const owners = new Map<string, string>();

    for (const node of nodes) {
        const owner = config.ownerTurnFn?.(model, node);

        if (owner) owners.set(node.id, owner);
    }

    const groups: Node[][] = [];

    const rootGroup = nodes.filter(
        (node) => node.id === model.root || (!config.turnIdFn(node) && !owners.has(node.id)),
    );

    if (rootGroup.length > 0) groups.push(rootGroup);

    for (const turnID of model.turns)
        groups.push(
            nodes.filter(
                (node) => config.turnIdFn(node) === turnID || owners.get(node.id) === turnID,
            ),
        );

    const clusters = new Map<string, LayoutBounds>();
    let columnX = 0;

    for (const group of groups) {
        const cursors = new Map<string, number>();

        const cursorFor = (lane: string) => {
            if (!cursors.has(lane)) cursors.set(lane, columnX);

            return cursors.get(lane)!;
        };

        const staged = group.map((node) => {
            const lane = config.laneOfFn(node);
            const start = cursorFor(lane);
            const width = config.nodeSizeFn(node)[0];
            cursors.set(lane, start + width + gap);

            // Positions are node centres (the renderer places boxes on their centre), so add half-width.
            return { node, x: start + width / 2 };
        });

        for (const entry of staged) place(entry.node, entry.x);

        const width = Math.max(
            ...[...cursors.values()].map((end) => end - gap - columnX),
            minColumnWidth,
        );
        columnX += width + turnGap;
    }

    // Derived clusters keep their membership order; their bounds drive the host's bands.
    for (const node of model.nodes) {
        const members = config.clusterOfFn?.(node);

        if (!members) continue;

        const bounds = memberPositions(members, positions);

        if (bounds) clusters.set(node.id, bounds);
    }

    // Turn bands span all of a turn's members and the turn node itself.
    for (const turnID of model.turns) {
        const members = memberPositions(
            [
                turnID,
                ...model.nodes
                    .filter((node) => config.turnIdFn(node) === turnID)
                    .map((node) => node.id),
            ],
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

    const positions = new Map<string, Position>();
    const clusters = new Map<string, LayoutBounds>();
    let turnIndex = 0;

    // The leading block (the root group, or the first turn when the model has none) opens the timeline.
    const [leading] = turnBlocks(model, config);

    if (leading && leading.length > 0) {
        let row = 0;

        for (let i = 0; i < leading.length; i += columns) {
            let cursor = 0;

            for (const node of leading.slice(i, i + columns)) {
                const width = config.nodeSizeFn(node)[0];
                positions.set(node.id, {
                    x: cursor + width / 2,
                    y: row * rowHeight,
                    z: depthOf(config.depthMap, node.kind) * depthStep,
                });
                cursor += width + gap;
            }

            row += 1;
        }

        // The root band spans the leading block
        const members = memberPositions(
            [model.root, ...leading.map((node) => node.id)],
            positions,
        );

        if (members) clusters.set('session', members);

        turnIndex += 1;
    }

    // Each turn gets its own column band
    for (const turnID of model.turns) {
        const turnNodes = model.nodes.filter(
            (node) => config.turnIdFn(node) === turnID || node.id === turnID,
        );

        if (turnNodes.length === 0) continue;

        const columnX = turnIndex * turnColumnWidth;
        let row = 0;

        for (let i = 0; i < turnNodes.length; i += columns) {
            let cursor = columnX;

            for (const node of turnNodes.slice(i, i + columns)) {
                const width = config.nodeSizeFn(node)[0];
                positions.set(node.id, {
                    x: cursor + width / 2,
                    y: row * rowHeight,
                    z: depthOf(config.depthMap, node.kind) * depthStep,
                });
                cursor += width + gap;
            }

            row += 1;
        }

        // Turn band spans this turn's column
        const members = memberPositions(
            [turnID, ...turnNodes.filter((node) => node.id !== turnID).map((node) => node.id)],
            positions,
        );

        if (members) clusters.set(turnID, members);

        turnIndex += 1;
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

    const positions = new Map<string, Position>();
    let column = 0;

    for (const nodes of turnBlocks(model, config)) {
        let row = 0;

        for (const node of nodes) {
            if (row >= rowsPerColumn) {
                row = 0;
                column += 1;
            }

            const depth = depthOf(config.depthMap, node.kind);
            positions.set(node.id, {
                x: column * columnWidth + depth * indentStep + config.geometry.standardSize[0] / 2,
                y: row * rowHeight,
                z: depth * depthStep,
            });
            row += 1;
        }

        column += 1;
    }

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
