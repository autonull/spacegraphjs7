import type { NodeStatus, RenderEdge, RenderModel, RenderNode } from '@spacegraphjs/renderer';
import { escapeHtml, formatOpacity } from './html';
import type {
  AdapterAxisLabel,
  AdapterBounds,
  AdapterConfig,
  AdapterEdge,
  AdapterGeometry,
  AdapterLaneLabel,
  AdapterModel,
  AdapterNode,
  AdapterPosition,
  BandTemplate,
  BuildOptions,
  CardContext,
} from './types';

const ZERO: AdapterPosition = { x: 0, y: 0, z: 0 };

const DEFAULT_GEOMETRY: AdapterGeometry = {
  chipSize: [132, 44, 0],
  panelSize: [132, 44, 0],
  dimOpacity: 0.3,
  bandPadding: 28,
  laneLabelSize: [132, 28, 0],
  laneGutter: 20,
  axisLabelSize: [132, 24, 0],
};

/**
 * The host-agnostic pipeline from a domain model to the renderer contract's `RenderModel`: level
 * filter, node map, bands, lane gutter, axes, edges. The base owns the order and the budget; the
 * host owns the vocabulary through the abstract methods and the configuration.
 */
export abstract class ModelAdapter<
  Node extends AdapterNode = AdapterNode,
  Edge extends AdapterEdge = AdapterEdge,
  Level extends string = string,
  Domain extends AdapterModel<Node, Edge> = AdapterModel<Node, Edge>,
> {
  protected readonly config: AdapterConfig<Node, Edge, Level, Domain>;
  protected readonly geometry: AdapterGeometry;

  constructor(config: AdapterConfig<Node, Edge, Level, Domain> = {}) {
    this.config = config;
    this.geometry = { ...DEFAULT_GEOMETRY, ...config.geometry };
  }

  /** The renderer shape of a node. */
  abstract nodeShape(node: Node): RenderNode['shape'];

  /** The renderer status of a node. */
  abstract nodeStatus(node: Node): NodeStatus;

  /** Whether a kind is chrome rather than activity. */
  abstract isStructuralKind(kind: Node['kind']): boolean;

  /** The renderer affordance data of a node. */
  abstract nodeData(node: Node, level: Level, dimmed: boolean): Record<string, unknown>;

  /** The renderer edge of a domain edge. */
  abstract toRenderEdge(edge: Edge, level: Level): RenderEdge;

  /** The bands drawn behind the content. Optional: a host without bands overrides nothing. */
  buildBands(
    _model: Domain,
    _level: Level,
    _positions: ReadonlyMap<string, AdapterPosition>,
    _renderBand: BandTemplate<Node>,
    _visible: ReadonlySet<string>,
  ): RenderNode[] {
    return [];
  }

  /** Provenance bundling. Optional: the default keeps every edge. */
  bundleEdges(_model: Domain, edges: readonly Edge[]): Edge[] {
    return [...edges];
  }

  /** The markup of an activity card. Optional: the default carries only model-derived content. */
  protected defaultCardTemplate(node: Node, _level: Level, context: CardContext): string {
    const badge = context.count ? ` <span style="opacity:.6">${context.count}</span>` : '';
    const summary = node.summary ? `<span style="opacity:.7">${escapeHtml(node.summary)}</span>` : '';

    return `<div data-kind="${node.kind}" data-status="${node.status}" style="display:flex;flex-direction:column;gap:2px;padding:8px 10px;color:inherit;font-family:inherit"><span style="font-weight:600">${escapeHtml(node.label)}${badge}</span>${summary}</div>`;
  }

  /** The markup of a band. Optional: the default is a translucent rounded box with a header. */
  protected defaultBandTemplate(node: Node, count: number, _bounds: AdapterBounds): string {
    const header = escapeHtml(node.label);

    return `<div data-band="${node.kind}" style="width:100%;height:100%;box-sizing:border-box;border:1px dashed currentColor;border-radius:12px;opacity:.28;pointer-events:none;position:relative;font-family:inherit"><span style="position:absolute;top:4px;left:10px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase">${header} · ${count}</span></div>`;
  }

  /** Builds the renderer model of a domain model at one level. */
  build(model: Domain, options: BuildOptions<Node, Level>): RenderModel {
    const level = options.level;
    const budget = options.cardBudget ?? this.resolveBudget(level);
    const renderCard = options.renderCard ?? this.config.renderCardTemplate ?? this.defaultCardTemplate;
    const renderBand = options.renderBand ?? this.config.renderBandTemplate ?? this.defaultBandTemplate;

    const visibleNodes = this.config.nodeFilter ? this.config.nodeFilter(model, level) : model.nodes;
    const visible = new Set(visibleNodes.map((node) => node.id));
    const candidates = model.edges.filter((edge) => visible.has(edge.source) && visible.has(edge.target));
    const rawEdges =
      (options.edges ?? true)
        ? this.config.edgeFilter
          ? this.config.edgeFilter(model, level, options.focus, candidates, visible)
          : candidates
        : [];

    const lit = options.focus
      ? new Set([options.focus, ...(this.config.neighbors?.(model, options.focus) ?? [])])
      : undefined;

    let cards = 0;

    const content = visibleNodes.map((node): RenderNode => {
      const position = options.positions.get(node.id) ?? ZERO;
      const shape = this.nodeShape(node);
      const chip = this.isClusterChip(node, level);
      const structural = this.isStructuralKind(node.kind);
      const asCard = (shape === 'card' || chip || structural) && (structural || cards < budget);
      const dimmed = lit ? !lit.has(node.id) : false;

      if (asCard && !structural) cards += 1;

      const data: Record<string, unknown> = { ...this.nodeData(node, level, dimmed), dimmed };

      if (!asCard) data.opacity = dimmed ? this.geometry.dimOpacity : 1;

      return {
        id: node.id,
        kind: node.kind,
        label: node.label,
        summary: node.summary,
        status: this.nodeStatus(node),
        shape: asCard ? 'card' : shape === 'card' ? 'dot' : shape,
        html: asCard
          ? this.wrapDim(renderCard(node, level, { count: chip ? (node.clusterOf?.length ?? 0) : 0, dimmed }), dimmed)
          : undefined,
        size: chip ? this.geometry.chipSize : structural ? this.geometry.panelSize : undefined,
        position: [position.x, position.y, position.z],
        data,
      };
    });

    const bands = (options.bands ?? this.config.bands ?? false)
      ? this.buildBands(model, level, options.positions, renderBand, visible)
      : [];
    const lanes = this.buildLaneLabels(options.laneLabels ?? this.config.laneLabels, content);
    const axes = (options.axisLabels ?? this.config.axisLabels ?? []).map((label) => this.buildAxisLabel(label));
    const edges = (options.bundle ?? this.config.bundleEdges ?? false)
      ? this.bundleEdges(model, rawEdges)
      : rawEdges;

    return {
      nodes: [...bands, ...lanes, ...axes, ...content],
      edges: edges.map((edge) => this.toRenderEdge(edge, level)),
    };
  }

  /** The DOM card budget of a level. Zero without a budget: the budget is a host policy. */
  protected resolveBudget(level: Level): number {
    const budget = this.config.cardBudget;

    if (typeof budget === 'function') return budget(level);

    return budget ?? 0;
  }

  /** A derived cluster that is collapsed at this level draws as a counted chip. */
  protected isClusterChip(node: Node, level: Level): boolean {
    if (node.derived !== true) return false;
    if ((node.clusterOf?.length ?? 0) === 0) return false;

    return !(this.config.isClusterExpanded?.(level) ?? true);
  }

  /**
   * The lane gutter: one non-interactive label chip per lane, left-aligned to the drawn content, so
   * the spatial grammar is visible without a screen-space overlay.
   */
  protected buildLaneLabels(
    labels: readonly AdapterLaneLabel[] | undefined,
    content: readonly RenderNode[],
  ): RenderNode[] {
    if (!labels || labels.length === 0 || content.length === 0) return [];

    const minX = Math.min(...content.map((node) => node.position[0]));
    const x = minX - this.geometry.laneGutter - this.geometry.laneLabelSize[0] / 2;

    return labels.map((lane) => ({
      id: `lane:${lane.id}`,
      kind: 'lane',
      label: lane.label,
      shape: 'panel' as const,
      interactive: false,
      html: `<div data-lane="${escapeHtml(lane.id)}" style="display:flex;align-items:center;height:100%;box-sizing:border-box;padding:0 10px;font-family:inherit;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--lane-label-color);opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(lane.label)}</div>`,
      size: this.geometry.laneLabelSize,
      position: [x, lane.y, ZERO.z - 1],
      data: { lane: lane.id, colorToken: 'textMuted' },
    }));
  }

  /** A non-interactive row or column caption for a summary representation. */
  protected buildAxisLabel(label: AdapterAxisLabel): RenderNode {
    return {
      id: `axis:${label.id}`,
      kind: 'lane',
      label: label.label,
      shape: 'panel',
      interactive: false,
      html: `<div data-axis="${label.role}" style="display:flex;align-items:center;height:100%;box-sizing:border-box;padding:0 8px;font-family:inherit;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(label.label)}</div>`,
      size: this.geometry.axisLabelSize,
      position: [label.x, label.y, ZERO.z - 1],
      data: { axis: label.role },
    };
  }

  /** Card markup is host-owned; out-neighbourhood cards fade without touching their content. */
  protected wrapDim(html: string, dimmed: boolean): string {
    return dimmed
      ? `<div style="width:100%;height:100%;opacity:${formatOpacity(this.geometry.dimOpacity)}">${html}</div>`
      : html;
  }
}
