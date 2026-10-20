/**
 * The structural types a host model must expose for the adapter pipeline, plus the configuration
 * and build options the pipeline reads. Nothing here knows a host's vocabulary: kinds, levels and
 * labels are strings the host resolves.
 */

/** The node fields the pipeline reads. A host model with more fields satisfies it. */
export interface AdapterNode {
  id: string;
  kind: string;
  label: string;
  summary?: string;
  /** The host's own status word; the adapter maps it through `nodeStatus`. */
  status: string;
  /** A derived node that groups others; it draws as a counted chip while it is collapsed. */
  derived?: boolean;
  /** The members of a derived cluster. */
  clusterOf?: readonly string[];
}

/** The edge fields the pipeline reads. */
export interface AdapterEdge {
  id: string;
  source: string;
  target: string;
  kind: string;
  label?: string;
  confidence?: string;
}

/** The domain model the adapter builds from. */
export interface AdapterModel<Node extends AdapterNode = AdapterNode, Edge extends AdapterEdge = AdapterEdge> {
  nodes: readonly Node[];
  edges: readonly Edge[];
}

/** A position in the graph's own coordinate space. */
export interface AdapterPosition {
  x: number;
  y: number;
  z: number;
}

/** The extent of a band in the graph's own coordinate space. */
export interface AdapterBounds {
  min: AdapterPosition;
  max: AdapterPosition;
}

/** A lane gutter label: a caption left of the content, anchored to the lane's Y. */
export interface AdapterLaneLabel {
  id: string;
  label: string;
  y: number;
}

/** A row or column caption for a summary representation. */
export interface AdapterAxisLabel {
  id: string;
  label: string;
  x: number;
  y: number;
  role: 'row' | 'column';
}

/** What a card template needs beyond the node itself. */
export interface CardContext {
  /** The member count of a collapsed cluster; zero for every other node. */
  count: number;
  /** Whether the node sits outside the focused neighbourhood. */
  dimmed: boolean;
}

/** The host-owned markup of an activity card. */
export type CardTemplate<Node extends AdapterNode = AdapterNode, Level extends string = string> = (
  node: Node,
  level: Level,
  context: CardContext,
) => string;

/** The host-owned markup of a band. */
export type BandTemplate<Node extends AdapterNode = AdapterNode> = (
  node: Node,
  count: number,
  bounds: AdapterBounds,
) => string;

/** The sizes and offsets the pipeline measures against. */
export interface AdapterGeometry {
  /** The footprint of a collapsed cluster chip. */
  chipSize: [number, number, number];
  /** The minimum legible footprint of a structural panel. */
  panelSize: [number, number, number];
  /** The opacity of a node outside the focused neighbourhood. */
  dimOpacity: number;
  /** The padding around a band so its members sit inside it. */
  bandPadding: number;
  /** The footprint of a lane gutter label. */
  laneLabelSize: [number, number, number];
  /** The gap between the lane gutter and the leftmost content. */
  laneGutter: number;
  /** The footprint of a row or column caption. */
  axisLabelSize: [number, number, number];
}

/** The policy a host binds into an adapter. */
export interface AdapterConfig<
  Node extends AdapterNode = AdapterNode,
  Edge extends AdapterEdge = AdapterEdge,
  Level extends string = string,
  Domain extends AdapterModel<Node, Edge> = AdapterModel<Node, Edge>,
> {
  /** The nodes that exist at a level. The default is every node. */
  nodeFilter?: (model: Domain, level: Level) => readonly Node[];
  /**
   * Narrows the edges a level shows. The candidates are the edges whose endpoints are both visible;
   * the visible ids come with them so a rule can narrow to a neighbourhood.
   */
  edgeFilter?: (
    model: Domain,
    level: Level,
    focus: string | undefined,
    candidates: readonly Edge[],
    visible: ReadonlySet<string>,
  ) => readonly Edge[];
  /** How many DOM cards a level may spend. Zero (the default) draws no activity cards. */
  cardBudget?: number | ((level: Level) => number);
  /** The markup of an activity card. */
  renderCardTemplate?: CardTemplate<Node, Level>;
  /** The markup of a band. */
  renderBandTemplate?: BandTemplate<Node>;
  /** The lane gutter captions. */
  laneLabels?: readonly AdapterLaneLabel[];
  /** The row and column captions. */
  axisLabels?: readonly AdapterAxisLabel[];
  /** Whether provenance edges are bundled onto their owner. */
  bundleEdges?: boolean;
  /** Whether bands are drawn behind the content. */
  bands?: boolean;
  /** Whether a derived cluster is expanded at a level; a collapsed one draws as a chip. */
  isClusterExpanded?: (level: Level) => boolean;
  /** The neighbours of a node, for the focus neighbourhood. */
  neighbors?: (model: Domain, id: string) => readonly string[];
  /** The sizes and offsets the pipeline measures against. */
  geometry?: Partial<AdapterGeometry>;
}

/** The per-build values of one pipeline run. */
export interface BuildOptions<
  Node extends AdapterNode = AdapterNode,
  Level extends string = string,
> {
  /** The semantic level the model is drawn at. */
  level: Level;
  /** The position of every node, in the graph's own coordinate space. */
  positions: ReadonlyMap<string, AdapterPosition>;
  /** The selected node; everything outside its neighbourhood is dimmed. */
  focus?: string;
  /** Draws the bands behind the content. */
  bands?: boolean;
  /** Emits the edges. */
  edges?: boolean;
  /** Bundles the provenance edges onto their owner. */
  bundle?: boolean;
  /** Overrides the DOM card budget of the level. */
  cardBudget?: number;
  /** Replaces the card markup for this build. */
  renderCard?: CardTemplate<Node, Level>;
  /** Replaces the band markup for this build. */
  renderBand?: BandTemplate<Node>;
  /** The lane gutter captions for this build. */
  laneLabels?: readonly AdapterLaneLabel[];
  /** The row and column captions for this build. */
  axisLabels?: readonly AdapterAxisLabel[];
}
