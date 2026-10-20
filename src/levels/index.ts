// Generic semantic zoom: which nodes and edges exist at a level, and how much DOM a level may
// spend on activity cards. The core owns the filtering and the budgets; the host owns the
// vocabulary (which kind belongs to which level) and the level-specific edge rules.

export type LabelMode = 'scale' | 'constant' | 'hide';

export interface LevelNode {
    id: string;
    kind: string;
    /** The level the node needs at minimum; overrides the fallback of its kind. */
    minLevel?: string;
    /** The members of a derived cluster chip. */
    clusterOf?: readonly string[];
}

export interface LevelEdge {
    id: string;
    source: string;
    target: string;
    kind: string;
}

export interface LevelConfig<
    Level extends string = string,
    Kind extends string = string,
    EdgeKind extends string = string,
    Node extends LevelNode = LevelNode,
    Edge extends LevelEdge = LevelEdge,
> {
    /** The level ordering; a lower rank is coarser. */
    levelRank: Readonly<Record<Level, number>>;
    /** The level at which a node kind becomes visible. */
    kindMinLevel: Readonly<Record<Kind, Level>>;
    /** The level at which an edge kind becomes visible. */
    edgeMinLevel: Readonly<Record<EdgeKind, Level>>;
    /** The DOM card budget per level. */
    domBudget: Readonly<Record<Level, number>>;
    /** Whether derived clusters are expanded at a level. */
    isClusterExpanded: (level: Level) => boolean;
    /**
     * Narrows the edges a level shows. The candidates are the edges the level already allows
     * (kind permitted, both endpoints visible); the visible ids come with them so a rule can
     * narrow to a neighbourhood.
     */
    edgeFilterFn?: (
        model: { nodes: readonly Node[]; edges: readonly Edge[] },
        level: Level,
        focus: string | undefined,
        candidates: readonly Edge[],
        visible: ReadonlySet<string>,
    ) => readonly Edge[];
}

/** The part of a level config the node filters need. */
type NodeLevels<Level extends string, Kind extends string> = {
    kindMinLevel: Readonly<Record<Kind, Level>>;
    levelRank: Readonly<Record<Level, number>>;
};

function lookup<Key extends string, Value>(
    record: Readonly<Record<Key, Value>>,
    key: string,
): Value | undefined {
    return (record as Readonly<Record<string, Value | undefined>>)[key];
}

function rankOf<Level extends string>(
    config: { levelRank: Readonly<Record<Level, number>> },
    level: Level,
): number {
    return config.levelRank[level] ?? 0;
}

/** The level a node needs at minimum: its own, or the fallback of its kind. */
function minLevelOf<Node extends LevelNode, Level extends string, Kind extends string>(
    node: Node,
    config: NodeLevels<Level, Kind>,
): Level {
    return (node.minLevel ?? lookup(config.kindMinLevel, node.kind)) as Level;
}

/** Whether a node exists at a level. Hidden nodes must not be interactive. */
function isVisibleAt<Node extends LevelNode, Level extends string, Kind extends string>(
    node: Node,
    level: Level,
    config: NodeLevels<Level, Kind>,
): boolean {
    return rankOf(config, minLevelOf(node, config)) <= rankOf(config, level);
}

/** The nodes visible at a level, in model order. */
function nodesAtLevel<Node extends LevelNode, Level extends string, Kind extends string>(
    model: { nodes: readonly Node[] },
    level: Level,
    config: NodeLevels<Level, Kind>,
): Node[] {
    return model.nodes.filter((node) => isVisibleAt(node, level, config));
}

/** The ids of the nodes visible at a level. */
function visibleNodeIDs<Node extends LevelNode, Level extends string, Kind extends string>(
    model: { nodes: readonly Node[] },
    level: Level,
    config: NodeLevels<Level, Kind>,
): Set<string> {
    return new Set(nodesAtLevel(model, level, config).map((node) => node.id));
}

/**
 * The edges visible at a level. Both endpoints must be visible, so an edge is never drawn to a
 * hidden node, and an edge kind without a level is never drawn. The host narrows the result with
 * `edgeFilterFn`, which receives the candidates this filter already allows.
 */
function edgesAtLevel<
    Node extends LevelNode,
    Edge extends LevelEdge,
    Level extends string,
    Kind extends string,
    EdgeKind extends string,
>(
    model: { nodes: readonly Node[]; edges: readonly Edge[] },
    level: Level,
    focus: string | undefined,
    config: LevelConfig<Level, Kind, EdgeKind, Node, Edge>,
): Edge[] {
    const visible = visibleNodeIDs(model, level, config);
    const candidates = model.edges.filter((edge) => {
        const min = lookup(config.edgeMinLevel, edge.kind);

        return (
            min !== undefined &&
            rankOf(config, min) <= rankOf(config, level) &&
            visible.has(edge.source) &&
            visible.has(edge.target)
        );
    });

    return config.edgeFilterFn
        ? [...config.edgeFilterFn(model, level, focus, candidates, visible)]
        : candidates;
}

/** The DOM card budget of a level. */
function domBudget<Level extends string>(
    level: Level,
    config: { domBudget: Readonly<Record<Level, number>> },
): number {
    return config.domBudget[level] ?? 0;
}

/** The member count a cluster chip shows. */
function clusterCount(node: LevelNode): number {
    return node.clusterOf?.length ?? 0;
}

/** Labels keep a constant screen size at every level; decluttering is a renderer concern. */
function labelMode(_level: string): LabelMode {
    return 'constant';
}

/** The semantic level API. A host calls it with its own level vocabulary. */
export const Levels = {
    minLevelOf,
    isVisibleAt,
    nodesAtLevel,
    visibleNodeIDs,
    edgesAtLevel,
    domBudget,
    clusterCount,
    labelMode,
};
