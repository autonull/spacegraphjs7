import { InteractionPlugin, MinimapPlugin } from '../plugins';
import { HUDPlugin } from '../plugins/HUDPlugin';
import { SpaceGraph } from '../SpaceGraph';
import type { Edge, GraphSpec, Node } from '../types';
import {
  addGrid,
  renderButtons,
  renderTitleCard,
  renderToolbar,
  renderToolbarActions,
  setupSearchHUD,
  updateStatsHUD,
} from './SpaceGraphAppHUD';
import { setupHotkeys, setupInteractionHandlers } from './SpaceGraphAppInteraction';
import { setTheme, setupDefaultHUD } from './SpaceGraphAppTheme';

export interface SpaceGraphAppOptions {
  spec?: GraphSpec;
  title?: string;
  description?: string;
  enableMinimap?: boolean;
  enableInteraction?: boolean;
  enableHistory?: boolean;
  selectionHighlightClass?: string;
  selectionHighlightColor?: number;
  selectionHighlightEdgeColor?: number;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
  };
  onNodeSelect?: (nodes: Node[]) => void;
  onNodeDblClick?: (node: Node) => void;
  nodeContextMenu?: (node: Node) => Array<{ label: string; action: () => void }>;
  onEdgeSelect?: (edges: Edge[]) => void;
  onEdgeDblClick?: (edge: Edge) => void;
  edgeContextMenu?: (edge: Edge) => Array<{ label: string; action: () => void }>;
  onEdgeCreate?: (source: Node, target: Node) => void;
  edgeTooltip?: (edge: Edge) => string | HTMLElement;
  graphContextMenu?: () => Array<{ label: string; action: () => void }>;
  nodeTooltip?: (node: Node) => string | HTMLElement;
  enableGrid?: boolean;
  enableSearch?: boolean;
  hotkeys?: Record<string, () => void>;
  toolbarActions?: AppButtonConfig[];
  actions?: AppButtonConfig[];
}

export interface AppButtonConfig {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
}

export class SpaceGraphApp {
  public readonly sg: SpaceGraph;
  public readonly options: SpaceGraphAppOptions;
  public hud!: HUDPlugin;
  public currentSelected = new Set<Node>();
  public currentSelectedEdges = new Set<Edge>();
  public buttons: AppButtonConfig[] = [];
  public toolbarActions: AppButtonConfig[] = [];
  public _zoomSliderHandler?: () => void;
  private originalColors = new Map<Node | Edge, number>();
  private originalEdgeColors = new Map<Node | Edge, number>();

  private constructor(sg: SpaceGraph, options: SpaceGraphAppOptions) {
    this.sg = sg;
    this.options = options;
  }

  static async create(
    container: HTMLElement | string,
    options: SpaceGraphAppOptions = {}
  ): Promise<SpaceGraphApp> {
    const resolvedOptions: SpaceGraphAppOptions = {
      enableMinimap: true,
      enableInteraction: true,
      enableHistory: true,
      selectionHighlightClass: 'sg-node-selected',
      selectionHighlightColor: 0xffffff,
      ...options,
    };

    const theme = {
      primaryColor: '#3b82f6',
      secondaryColor: '#8b5cf6',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      ...resolvedOptions.theme,
    };
    resolvedOptions.theme = theme;

    const sg = await SpaceGraph.create(container, resolvedOptions.spec ?? { nodes: [], edges: [] });
    const app = new SpaceGraphApp(sg, resolvedOptions);

    if (resolvedOptions.actions) app.buttons.push(...resolvedOptions.actions);
    if (resolvedOptions.toolbarActions) app.toolbarActions.push(...resolvedOptions.toolbarActions);

    setupHotkeys(app);

    app.hud = new HUDPlugin();
    app.sg.pluginManager.register('HUDPlugin', app.hud);

    if (resolvedOptions.enableInteraction) {
      const interaction = new InteractionPlugin();
      app.sg.pluginManager.register('InteractionPlugin', interaction);
      setTimeout(() => setupInteractionHandlers(app), 0);
    }

    if (resolvedOptions.enableMinimap) {
      app.sg.pluginManager.register('MinimapPlugin', new MinimapPlugin());
    }

    await app.sg.pluginManager.initAll();
    addGrid(app);
    setupDefaultHUD(app, theme);

    if (resolvedOptions.enableSearch) {
      setupSearchHUD(app, theme);
    }

    if (app.buttons.length > 0) {
      renderButtons(app, theme);
    }

    return app;
  }

  public setTheme(theme: Partial<SpaceGraphAppOptions['theme']>) {
    setTheme(this, theme ?? {});
  }

  public setMode(mode: 'default' | 'select' | 'connect') {
    const interaction = this.sg.pluginManager.getPlugin('interaction') as InteractionPlugin;
    if (interaction) interaction.mode = mode;
  }

  public clearSelectionStyles() {
    for (const node of this.currentSelected) this._clearNodeStyle(node);
    this.originalColors.clear();
    for (const edge of this.currentSelectedEdges) this._clearEdgeStyle(edge);
    this.originalEdgeColors.clear();
  }

  public applySelectionStyles() {
    for (const node of this.currentSelected) this._applyNodeStyle(node);
    for (const edge of this.currentSelectedEdges) this._applyEdgeStyle(edge);
  }

  public addToolbarAction(config: AppButtonConfig) {
    this.toolbarActions.push(config);
    renderToolbarActions(this);
  }

  public addButton(config: AppButtonConfig) {
    this.buttons.push(config);
    renderButtons(this, this.options.theme);
  }

  public updateStatsHUD() {
    updateStatsHUD(this);
  }

  public showAlert(message: string) {
    this.hud.showAlert(message);
  }

  public showModal(options: { title: string; html: string; width?: string; onClose?: () => void }) {
    this.hud.showModal(options.title, options.html);
  }

  public hideModal() {
    this.hud.hideModal();
  }

  public showLoading(message?: string) {
    this.hud.showLoading(message ?? '');
  }

  public hideLoading() {
    this.hud.hideLoading();
  }

  public exportData() {
    return this.sg.export();
  }

  public importData(data: any) {
    this.sg.import(data);
    this._emitSelectionChanged();
  }

  public focusOnNodes(nodeIds: string[], padding = 100, duration = 1.5) {
    this.sg.fitView(padding, duration, nodeIds);
  }

  public addNode(nodeSpec: any) {
    this.sg.graph.addNode(nodeSpec);
    this._emitSelectionChanged();
  }

  public updateNode(nodeId: string, nodeSpec: any) {
    this.sg.graph.updateNode(nodeId, nodeSpec);
  }

  public removeNode(nodeId: string) {
    const node = this.sg.graph.getNode(nodeId);
    if (node) {
      this.currentSelected.delete(node);
      this.sg.graph.removeNode(nodeId);
      this._emitSelectionChanged();
    }
  }

  public addEdge(edgeSpec: any) {
    this.sg.graph.addEdge(edgeSpec);
    this._emitSelectionChanged();
  }

  public updateEdge(edgeId: string, edgeSpec: any) {
    this.sg.graph.updateEdge(edgeId, edgeSpec);
  }

  public removeEdge(edgeId: string) {
    const edge = this.sg.graph.getEdge(edgeId);
    if (edge) {
      this.currentSelectedEdges.delete(edge);
      this.sg.graph.removeEdge(edgeId);
      this._emitSelectionChanged();
    }
  }

  public clearSelection() {
    this.clearSelectionStyles();
    this.currentSelected.clear();
    this.currentSelectedEdges.clear();
    this._emitSelectionChanged();
  }

  public getSelectedNodes(): Node[] {
    return [...this.currentSelected];
  }

  public getSelectedEdges(): Edge[] {
    return [...this.currentSelectedEdges];
  }

  public dispose() {
    if (this._zoomSliderHandler) {
      this.sg.events.off('camera:move', this._zoomSliderHandler);
      this._zoomSliderHandler = undefined;
    }
    this.hud.dispose();
  }

  private _emitSelectionChanged(): void {
    this.sg.events.emit('selection:changed', {
      nodes: [...this.currentSelected].map((n) => n.id),
      edges: [...this.currentSelectedEdges].map((e) => e.id),
      timestamp: Date.now(),
    });
  }

  private _clearNodeStyle(node: Node): void {
    if ((node as any).isHtmlNode && this.options.selectionHighlightClass) {
      (node as any).domElement.classList.remove(this.options.selectionHighlightClass);
      return;
    }
    this._restoreColor(node, this.originalColors);
  }

  private _applyNodeStyle(node: Node): void {
    if ((node as any).isHtmlNode && this.options.selectionHighlightClass) {
      (node as any).domElement.classList.add(this.options.selectionHighlightClass);
      return;
    }
    this._highlightColor(node, this.originalColors, this.options.selectionHighlightColor);
  }

  private _clearEdgeStyle(edge: Edge): void {
    this._restoreColor(edge, this.originalEdgeColors);
  }

  private _applyEdgeStyle(edge: Edge): void {
    this._highlightColor(edge, this.originalEdgeColors, this.options.selectionHighlightEdgeColor);
  }

  /** Remember a surface's own colour, then paint it with the highlight colour. */
  private _highlightColor(
    surface: Node | Edge,
    originals: Map<Node | Edge, number>,
    color: number | undefined
  ): void {
    if (!color || surface.data?.color === undefined) return;
    originals.set(surface, surface.data.color as number);
    surface.updateSpec({ data: { color } });
  }

  /** Put a surface's own colour back. */
  private _restoreColor(surface: Node | Edge, originals: Map<Node | Edge, number>): void {
    if (!originals.has(surface)) return;
    surface.updateSpec({ data: { color: originals.get(surface) } });
  }
}

// Re-export helpers
export {
  renderButtons,
  renderTitleCard,
  renderToolbar,
  renderToolbarActions,
  setupSearchHUD,
  updateStatsHUD,
};
