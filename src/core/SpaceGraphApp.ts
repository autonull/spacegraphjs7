import { SpaceGraph } from '../SpaceGraph';
import type { GraphSpec } from '../types';
import { HUDPlugin } from '../plugins/HUDPlugin';
import { InteractionPlugin } from '../plugins/InteractionPlugin';
import { MinimapPlugin } from '../plugins/MinimapPlugin';
import { HtmlNode } from '../nodes/HtmlNode';
import { CameraUtils } from '../utils/CameraUtils';
import {
    addGrid,
    setupSearchHUD,
    renderButtons,
    renderToolbarActions,
    updateStatsHUD,
} from './SpaceGraphAppHUD';
import { setupInteractionHandlers, setupHotkeys } from './SpaceGraphAppInteraction';
import { setupDefaultHUD, setTheme } from './SpaceGraphAppTheme';

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
    onNodeSelect?: (nodes: any[]) => void;
    onNodeDblClick?: (node: any) => void;
    nodeContextMenu?: (node: any) => Array<{ label: string; action: () => void }>;
    onEdgeSelect?: (edges: any[]) => void;
    onEdgeDblClick?: (edge: any) => void;
    edgeContextMenu?: (edge: any) => Array<{ label: string; action: () => void }>;
    onEdgeCreate?: (source: any, target: any) => void;
    edgeTooltip?: (edge: any) => string | HTMLElement;
    graphContextMenu?: () => Array<{ label: string; action: () => void }>;
    nodeTooltip?: (node: any) => string | HTMLElement;
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
    private currentSelected: any[] = [];
    private currentSelectedEdges: any[] = [];
    private originalColors = new Map<any, number>();
    private originalEdgeColors = new Map<any, number>();
    public buttons: AppButtonConfig[] = [];
    public toolbarActions: AppButtonConfig[] = [];
    private _zoomSliderHandler?: () => void;

    private constructor(sg: SpaceGraph, options: SpaceGraphAppOptions) {
        this.sg = sg;
        this.options = options;
    }

    static async create(
        container: HTMLElement | string,
        options: SpaceGraphAppOptions = {},
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

        const sg = await SpaceGraph.create(
            container,
            resolvedOptions.spec ?? { nodes: [], edges: [] },
        );

        const app = new SpaceGraphApp(sg, resolvedOptions);

        if (resolvedOptions.actions) app.buttons.push(...resolvedOptions.actions);
        if (resolvedOptions.toolbarActions)
            app.toolbarActions.push(...resolvedOptions.toolbarActions);

        setupHotkeys(app);

        app.hud = new HUDPlugin();
        app.sg.pluginManager.register('HUDPlugin', app.hud);

        if (app.options.enableInteraction) {
            const interaction = new InteractionPlugin();
            app.sg.pluginManager.register('InteractionPlugin', interaction);
            setTimeout(() => setupInteractionHandlers(app), 0);
        }

        if (app.options.enableMinimap) {
            app.sg.pluginManager.register('MinimapPlugin', new MinimapPlugin());
        }

        app.sg.pluginManager.initAll();
        addGrid(app);
        setupDefaultHUD(app, theme);

        if (app.options.enableSearch) {
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
        for (const node of this.currentSelected) {
            if (node instanceof HtmlNode && this.options.selectionHighlightClass) {
                node.domElement.classList.remove(this.options.selectionHighlightClass);
            } else if (this.options.selectionHighlightColor && this.originalColors.has(node)) {
                node.updateSpec({ data: { color: this.originalColors.get(node) } });
            }
        }
        this.originalColors.clear();

        for (const edge of this.currentSelectedEdges) {
            if (this.options.selectionHighlightEdgeColor && this.originalEdgeColors.has(edge)) {
                edge.updateSpec({ data: { color: this.originalEdgeColors.get(edge) } });
            }
        }
        this.originalEdgeColors.clear();
    }

    public applySelectionStyles() {
        for (const node of this.currentSelected) {
            if (node instanceof HtmlNode && this.options.selectionHighlightClass) {
                node.domElement.classList.add(this.options.selectionHighlightClass);
            } else if (
                this.options.selectionHighlightColor &&
                node.data?.color !== undefined &&
                typeof node.updateSpec === 'function'
            ) {
                this.originalColors.set(node, node.data.color);
                node.updateSpec({ data: { color: this.options.selectionHighlightColor } });
            }
        }

        for (const edge of this.currentSelectedEdges) {
            if (
                this.options.selectionHighlightEdgeColor &&
                edge.data?.color !== undefined &&
                typeof edge.updateSpec === 'function'
            ) {
                this.originalEdgeColors.set(edge, edge.data.color);
                edge.updateSpec({ data: { color: this.options.selectionHighlightEdgeColor } });
            }
        }
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

    public showModal(options: {
        title: string;
        html: string;
        width?: string;
        onClose?: () => void;
    }) {
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
        this.sg.events.emit('selection:changed', {
            nodes: this.currentSelected,
            edges: this.currentSelectedEdges,
            timestamp: Date.now(),
        });
    }

    public focusOnNodes(nodeIds: string[], padding = 100, duration = 1.5) {
        const nodes = nodeIds
            .map((id) => this.sg.graph.getNode(id))
            .filter((n): n is NonNullable<typeof n> => n != null);
        if (nodes.length === 0) return;

        const fit = CameraUtils.calculateFitView(nodes, this.sg.renderer.camera, padding);
        if (fit) {
            this.sg.cameraControls.flyTo(fit.center, fit.cameraZ, duration);
        }
    }

    public addNode(nodeSpec: any) {
        this.sg.graph.addNode(nodeSpec);
        this.sg.events.emit('selection:changed', {
            nodes: this.currentSelected,
            edges: this.currentSelectedEdges,
            timestamp: Date.now(),
        });
    }

    public updateNode(nodeId: string, nodeSpec: any) {
        this.sg.graph.updateNode(nodeId, nodeSpec);
    }

    public removeNode(nodeId: string) {
        const node = this.sg.graph.getNode(nodeId);
        if (node) {
            const index = this.currentSelected.indexOf(node);
            if (index > -1) this.currentSelected.splice(index, 1);
            this.sg.graph.removeNode(nodeId);
            this.sg.events.emit('selection:changed', {
                nodes: this.currentSelected,
                edges: this.currentSelectedEdges,
                timestamp: Date.now(),
            });
        }
    }

    public addEdge(edgeSpec: any) {
        this.sg.graph.addEdge(edgeSpec);
        this.sg.events.emit('selection:changed', {
            nodes: this.currentSelected,
            edges: this.currentSelectedEdges,
            timestamp: Date.now(),
        });
    }

    public updateEdge(edgeId: string, edgeSpec: any) {
        this.sg.graph.updateEdge(edgeId, edgeSpec);
    }

    public removeEdge(edgeId: string) {
        const edge = this.sg.graph.getEdge(edgeId);
        if (edge) {
            const index = this.currentSelectedEdges.indexOf(edge);
            if (index > -1) this.currentSelectedEdges.splice(index, 1);
            this.sg.graph.removeEdge(edgeId);
            this.sg.events.emit('selection:changed', {
                nodes: this.currentSelected,
                edges: this.currentSelectedEdges,
                timestamp: Date.now(),
            });
        }
    }

    public clearSelection() {
        this.clearSelectionStyles();
        this.currentSelected = [];
        this.currentSelectedEdges = [];
        this.sg.events.emit('selection:changed', {
            nodes: this.currentSelected,
            edges: this.currentSelectedEdges,
            timestamp: Date.now(),
        });
    }

    public getSelectedNodes(): any[] {
        return this.currentSelected;
    }

    public getSelectedEdges(): any[] {
        return this.currentSelectedEdges;
    }

    public dispose() {
        if (this._zoomSliderHandler) {
            this.sg.events.off('camera:move', this._zoomSliderHandler);
            this._zoomSliderHandler = undefined;
        }
        this.hud.dispose();
    }
}
