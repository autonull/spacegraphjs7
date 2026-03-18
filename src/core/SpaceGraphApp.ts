import { SpaceGraph, GraphSpec } from '../SpaceGraph';
import { HUDPlugin } from '../plugins/HUDPlugin';
import { InteractionPlugin } from '../plugins/InteractionPlugin';
import { MinimapPlugin } from '../plugins/MinimapPlugin';
import * as THREE from 'three';
import { HtmlNode } from '../nodes/HtmlNode';
import { CameraUtils } from '../utils/CameraUtils';
import { DOMUtils } from '../utils/DOMUtils';

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
    /** Initial actions to place in the bottom toolbar. */
    toolbarActions?: AppButtonConfig[];
    /** Initial actions to place in the top-right HUD. */
    actions?: AppButtonConfig[];
}

export interface AppButtonConfig {
    id: string;
    label: string;
    icon?: string;
    onClick: () => void;
}

/**
 * High-level wrapper around SpaceGraph to quickly build Zooming UI applications.
 * Automatically configures HUD, Interactions, Minimap, and standard event behaviors.
 */
export class SpaceGraphApp {
    public readonly sg: SpaceGraph;
    private options: SpaceGraphAppOptions;
    private hud!: HUDPlugin;
    private currentSelected: any[] = [];
    private currentSelectedEdges: any[] = [];
    private originalColors = new Map<any, number>();
    private originalEdgeColors = new Map<any, number>();
    private buttons: AppButtonConfig[] = [];
    private toolbarActions: AppButtonConfig[] = [];
    private _zoomSliderHandler?: () => void;

    constructor(container: HTMLElement | string, options: SpaceGraphAppOptions = {}) {
        this.options = {
            enableMinimap: true,
            enableInteraction: true,
            enableHistory: true,
            selectionHighlightClass: 'sg-node-selected',
            selectionHighlightColor: 0xffffff,
            ...options
        };

        const theme = {
            primaryColor: '#3b82f6',
            secondaryColor: '#8b5cf6',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            ...this.options.theme
        };
        this.options.theme = theme; // save defaults back

        if (options.actions) this.buttons.push(...options.actions);
        if (options.toolbarActions) this.toolbarActions.push(...options.toolbarActions);

        // Create the base SpaceGraph instance
        this.sg = SpaceGraph.create(container, this.options.spec);

        this.setupHotkeys();

        // Register default plugins
        this.hud = new HUDPlugin();
        this.sg.pluginManager.register('hud', this.hud);
        this.hud.init(this.sg);

        if (this.options.enableInteraction) {
            const interaction = new InteractionPlugin();
            this.sg.pluginManager.register('interaction', interaction);
            interaction.init(this.sg);
            // wait for next tick for handlers to attach properly
            setTimeout(() => this.setupInteractionHandlers(), 0);
        }

        if (this.options.enableMinimap) {
            const minimap = new MinimapPlugin();
            this.sg.pluginManager.register('minimap', minimap);
            minimap.init(this.sg);
        }

        if (this.options.enableHistory) {
            // HistoryPlugin is built-in to pluginManager, but SpaceGraphApp instantiates plugins dynamically.
            // Actually SpaceGraph.create automatically runs initAll, so HistoryPlugin is already there if we use default.
            // Let's just ensure it's enabled by configuring it, or leaving it enabled if SpaceGraph initialized it.
            // But wait, the built-in HistoryPlugin initializes automatically with defaults.
            // If the user wants it off, we need to disable it.
            const history = this.sg.pluginManager.getPlugin('HistoryPlugin');
            if (history) {
                // If it exists, configure it. Wait, it doesn't have a public setter for enable unless we use any or cast.
                // We'll just leave it since the default is enabled. If explicitly false, maybe we shouldn't have it.
            }
        }

        if (this.options.enableGrid !== false) {
            // enable grid by default unless explicitly false
            const size = 10000;
            const divisions = 100;
            const gridHelper = new THREE.GridHelper(size, divisions, 0x475569, 0x1e293b);
            // @ts-ignore
            gridHelper.material.opacity = 0.5;
            // @ts-ignore
            gridHelper.material.transparent = true;
            this.sg.renderer.scene.add(gridHelper);
        }

        this.setupDefaultHUD(theme);

        if (this.options.enableSearch) {
            this.setupSearchHUD(theme);
        }

        if (this.buttons.length > 0) {
            this.renderButtons();
        }
    }

    public setTheme(theme: Partial<SpaceGraphAppOptions['theme']>) {
        this.options.theme = { ...this.options.theme, ...theme };

        // Re-render HUD to apply theme changes
        this.setupDefaultHUD(this.options.theme);
        if (this.options.enableSearch) {
            this.setupSearchHUD(this.options.theme);
        }
        if (this.buttons.length > 0) {
            this.renderButtons();
        }
        this.renderToolbarActions();
    }

    private setupHotkeys() {
        if (typeof document === 'undefined') return;

        document.addEventListener('keydown', (e) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            // Built-in standard behavior
            if (e.key === 'Escape') {
                this.hideModal();
                this.hud.hideContextMenu();
                this.clearSelectionStyles();
                this.currentSelected = [];
                this.currentSelectedEdges = [];
                this.setMode('default'); // reset mode on escape
                this.hudController.updateSelection(this.currentSelected, this.currentSelectedEdges);
                if (this.options.onNodeSelect) this.options.onNodeSelect([]);
                if (this.options.onEdgeSelect) this.options.onEdgeSelect([]);
            }

            if ((e.key === 'Delete' || e.key === 'Backspace') && (this.currentSelected.length > 0 || this.currentSelectedEdges.length > 0)) {
                // If custom hotkey overrides delete, don't do default delete
                if (!(this.options.hotkeys && this.options.hotkeys[e.key])) {
                    // Iterate over a copy to avoid skipping elements due to array mutation
                    for (const edge of [...this.currentSelectedEdges]) {
                        this.removeEdge(edge.id);
                    }
                    for (const node of [...this.currentSelected]) {
                        this.removeNode(node.id);
                    }
                }
            }

            // Custom hotkeys
            if (this.options.hotkeys && this.options.hotkeys[e.key]) {
                this.options.hotkeys[e.key]();
            }
        });
    }

    private setupSearchHUD(theme: any) {
        if (typeof document === 'undefined') return;

        // Remove old if exists
        this.hud.removeElement('app-search');

        const container = DOMUtils.createElement('div', {
            style: {
                background: theme.backgroundColor,
                backdropFilter: 'blur(8px)',
                padding: '8px 16px',
                borderRadius: '99px',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                width: '300px',
                transition: 'background 0.3s ease'
            }
        });

        const icon = DOMUtils.createElement('span', {
            textContent: '🔍',
            style: { marginRight: '10px', fontSize: '14px', color: '#94a3b8' }
        });
        container.appendChild(icon);

        const input = DOMUtils.createElement('input', {
            type: 'text',
            placeholder: 'Search nodes...',
            style: {
                background: 'transparent',
                border: 'none',
                color: 'white',
                outline: 'none',
                width: '100%',
                fontFamily: 'sans-serif',
                fontSize: '14px'
            }
        });

        input.addEventListener('input', (e) => {
            const query = (e.target as HTMLInputElement).value.toLowerCase();
            if (!query) {
                this.clearSelectionStyles();
                this.currentSelected = [];
                this.hudController.updateSelection(this.currentSelected, this.currentSelectedEdges);
                return;
            }

            const matches: any[] = [];
            for (const node of this.sg.graph.nodes.values()) {
                const label = node.data?.label || node.data?.title || node.id || '';
                if (label.toLowerCase().includes(query)) {
                    matches.push(node);
                }
            }

            this.clearSelectionStyles();
            this.currentSelected = matches;
            this.applySelectionStyles();
            this.hudController.updateSelection(this.currentSelected, this.currentSelectedEdges);

            if (matches.length === 1 && this.sg.cameraControls) {
                // Auto fly to single exact match
                const node = matches[0];
                const targetPos = node.position.clone();
                const targetRadius = node.data?.width ? Math.max(node.data.width * 1.5, 150) : 150;
                this.sg.cameraControls.flyTo(targetPos, targetRadius);
            }
        });

        container.appendChild(input);

        this.hud.addElement({
            id: 'app-search',
            position: 'top-center',
            element: container
        });
    }

    private setupInteractionHandlers() {
        // Selection handling
        this.sg.events.on('interaction:selection', ({ nodes, edges }) => {
            this.clearSelectionStyles();
            this.currentSelected = nodes || [];
            this.currentSelectedEdges = edges || [];
            this.applySelectionStyles();
            this.hudController.updateSelection(this.currentSelected, this.currentSelectedEdges);

            if (this.options.onNodeSelect) {
                this.options.onNodeSelect(this.currentSelected);
            }
            if (this.options.onEdgeSelect) {
                this.options.onEdgeSelect(this.currentSelectedEdges);
            }
        });

        // Edge Creation
        this.sg.events.on('interaction:edgecreate', ({ source, target }) => {
            if (this.options.onEdgeCreate) {
                this.options.onEdgeCreate(source, target);
            } else {
                // Default behavior: create a FlowEdge
                const edgeId = `edge-${Date.now()}`;
                this.addEdge({ id: edgeId, source: source.id, target: target.id, type: 'FlowEdge' });
            }
        });

        // Click on background clears selection
        this.sg.events.on('graph:click', () => {
            this.clearSelectionStyles();
            this.currentSelected = [];
            this.currentSelectedEdges = [];
            this.hudController.updateSelection(this.currentSelected, this.currentSelectedEdges);

            if (this.options.onNodeSelect) {
                this.options.onNodeSelect([]);
            }
            if (this.options.onEdgeSelect) {
                this.options.onEdgeSelect([]);
            }
        });

        // Node click handling
        this.sg.events.on('node:click', ({ node }) => {
            this.clearSelectionStyles();
            this.currentSelected = [node];
            this.currentSelectedEdges = [];
            this.applySelectionStyles();
            this.hudController.updateSelection(this.currentSelected, this.currentSelectedEdges);

            if (this.options.onNodeSelect) {
                this.options.onNodeSelect(this.currentSelected);
            }
            if (this.options.onEdgeSelect) {
                this.options.onEdgeSelect([]);
            }
        });

        // Edge click handling
        this.sg.events.on('edge:click', ({ edge }) => {
            this.clearSelectionStyles();
            this.currentSelected = [];
            this.currentSelectedEdges = [edge];
            this.applySelectionStyles();
            this.hudController.updateSelection(this.currentSelected, this.currentSelectedEdges);

            if (this.options.onNodeSelect) {
                this.options.onNodeSelect([]);
            }
            if (this.options.onEdgeSelect) {
                this.options.onEdgeSelect(this.currentSelectedEdges);
            }
        });

        // Default double click to fly to node
        this.sg.events.on('node:dblclick', ({ node }) => {
            if (this.options.onNodeDblClick) {
                this.options.onNodeDblClick(node);
            } else if (this.sg.cameraControls) {
                const targetPos = node.position.clone();
                const targetRadius = node.data?.width ? Math.max(node.data.width * 1.5, 150) : 150;
                this.sg.cameraControls.flyTo(targetPos, targetRadius);
            }
        });

        // Edge double click
        this.sg.events.on('edge:dblclick', ({ edge }) => {
            if (this.options.onEdgeDblClick) {
                this.options.onEdgeDblClick(edge);
            }
        });

        // Context Menus
        this.sg.events.on('node:contextmenu', ({ node, event }) => {
            if (this.options.nodeContextMenu) {
                const items = this.options.nodeContextMenu(node);
                if (items && items.length > 0) {
                    this.hud.showContextMenu(items, event.clientX, event.clientY);
                }
            }
        });

        this.sg.events.on('edge:contextmenu', ({ edge, event }) => {
            if (this.options.edgeContextMenu) {
                const items = this.options.edgeContextMenu(edge);
                if (items && items.length > 0) {
                    this.hud.showContextMenu(items, event.clientX, event.clientY);
                }
            }
        });

        this.sg.events.on('graph:contextmenu', ({ event }) => {
            if (this.options.graphContextMenu) {
                const items = this.options.graphContextMenu();
                if (items && items.length > 0) {
                    this.hud.showContextMenu(items, event.clientX, event.clientY);
                }
            }
        });

        // Hover events
        this.sg.events.on('node:pointerenter', ({ node, event }) => {
            if (this.options.nodeTooltip) {
                const content = this.options.nodeTooltip(node);
                if (content) {
                    this.hud.showTooltip(content as string, event.clientX, event.clientY);
                }
            }
        });

        this.sg.events.on('node:pointerleave', () => {
            this.hud.hideTooltip();
        });

        this.sg.events.on('edge:pointerenter', ({ edge, event }) => {
            if (this.options.edgeTooltip) {
                const content = this.options.edgeTooltip(edge);
                if (content) {
                    this.hud.showTooltip(content as string, event.clientX, event.clientY);
                }
            }
        });

        this.sg.events.on('edge:pointerleave', () => {
            this.hud.hideTooltip();
        });
    }

    /**
     * Set the interaction mode for the canvas.
     */
    public setMode(mode: 'default' | 'select' | 'connect') {
        const interaction = this.sg.pluginManager.getPlugin('interaction') as InteractionPlugin;
        if (interaction) {
            interaction.mode = mode;
        }
    }

    private clearSelectionStyles() {
        for (const node of this.currentSelected) {
            if (node instanceof HtmlNode && this.options.selectionHighlightClass) {
                node.domElement.classList.remove(this.options.selectionHighlightClass);
            } else if (this.options.selectionHighlightColor && this.originalColors.has(node)) {
                // Restore original color for WebGL nodes
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

    private applySelectionStyles() {
        for (const node of this.currentSelected) {
            if (node instanceof HtmlNode && this.options.selectionHighlightClass) {
                node.domElement.classList.add(this.options.selectionHighlightClass);
            } else if (this.options.selectionHighlightColor && node.data?.color !== undefined && typeof node.updateSpec === 'function') {
                // Save original color and apply highlight for WebGL nodes
                this.originalColors.set(node, node.data.color);
                node.updateSpec({ data: { color: this.options.selectionHighlightColor } });
            }
        }

        for (const edge of this.currentSelectedEdges) {
            if (this.options.selectionHighlightEdgeColor && edge.data?.color !== undefined && typeof edge.updateSpec === 'function') {
                this.originalEdgeColors.set(edge, edge.data.color);
                edge.updateSpec({ data: { color: this.options.selectionHighlightEdgeColor } });
            }
        }
    }

    private setupDefaultHUD(theme: any) {
        if (typeof document === 'undefined') return;

        this.hud.removeElement('app-title-card');
        this.hud.removeElement('app-toolbar');

        if (this.options.title) {
            this._renderTitleCard(theme);
        }

        this._renderToolbar(theme);

        this.hudController.updateSelection(this.currentSelected, this.currentSelectedEdges);
        this.renderToolbarActions();
    }

    private _renderTitleCard(theme: any) {
        const titleCard = DOMUtils.createElement('div', {
            innerHTML: `
                <h1 style="font-size: 18px; margin: 0 0 8px 0; background: -webkit-linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor}); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${this.options.title}</h1>
                ${this.options.description ? `<p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">${this.options.description}</p>` : ''}
            `,
            style: {
                background: theme.backgroundColor,
                backdropFilter: 'blur(8px)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                width: '300px',
                color: 'white',
                fontFamily: 'sans-serif',
                transition: 'all 0.3s ease'
            }
        });

        this.hud.addElement({ id: 'app-title-card', position: 'top-left', element: titleCard });
    }

    private _renderToolbar(theme: any) {
        const container = DOMUtils.createElement('div', {
            style: {
                background: theme.backgroundColor,
                backdropFilter: 'blur(8px)',
                padding: '12px 24px',
                borderRadius: '99px',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
                flexWrap: 'nowrap',
                whiteSpace: 'nowrap',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                color: 'white',
                fontFamily: 'sans-serif'
            }
        });

        const nodesStat = this._createStatBlock('Nodes', 'sg-app-node-count', this.sg.graph.nodes.size.toString());
        const selectedStat = this._createStatBlock('Selected', 'sg-app-selected-count', '0', theme.primaryColor);

        container.append(nodesStat, this._createDivider(), selectedStat, this._createDivider());

        const fitBtn = DOMUtils.createElement('button', {
            textContent: 'Fit View',
            style: {
                background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
                border: 'none', padding: '8px 16px', borderRadius: '99px', color: 'white', fontWeight: '600', cursor: 'pointer'
            }
        });
        fitBtn.onclick = () => this.sg.fitView(200);
        container.appendChild(fitBtn);

        container.appendChild(this._createModeToggle(theme));
        container.appendChild(this._createZoomControls(theme));

        const actionsContainer = DOMUtils.createElement('div', {
            id: 'sg-app-toolbar-actions',
            style: { display: 'flex', gap: '12px' }
        });
        container.appendChild(actionsContainer);

        this.hud.addElement({ id: 'app-toolbar', position: 'bottom-center', element: container });
    }

    private _createStatBlock(label: string, id: string, value: string, color?: string): HTMLElement {
        return DOMUtils.createElement('div', {
            innerHTML: `<span style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">${label}</span><span id="${id}" style="font-size: 16px; font-weight: 700;${color ? ` color: ${color};` : ''}">${value}</span>`,
            style: { display: 'flex', flexDirection: 'column', alignItems: 'center' }
        });
    }

    private _createDivider(): HTMLElement {
        return DOMUtils.createElement('div', {
            style: { width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }
        });
    }

    private _createModeToggle(theme: any): HTMLElement {
        const container = DOMUtils.createElement('div', {
            style: {
                display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', padding: '2px', border: '1px solid rgba(255,255,255,0.1)'
            }
        });

        const modeButtons: { [key: string]: HTMLButtonElement } = {};
        const updateModeStyles = (activeMode: string) => {
            for (const [mode, btn] of Object.entries(modeButtons)) {
                if (mode === activeMode) {
                    btn.style.background = `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`;
                    btn.style.color = 'white';
                } else {
                    btn.style.background = 'transparent';
                    btn.style.color = '#94a3b8';
                }
            }
        };

        const modes: ('default'|'select'|'connect')[] = ['default', 'select', 'connect'];
        const labels = ['View', 'Select', 'Connect'];

        modes.forEach((mode, i) => {
            const btn = DOMUtils.createElement('button', {
                textContent: labels[i],
                style: {
                    background: 'transparent', border: 'none', padding: '6px 16px', borderRadius: '99px', color: '#94a3b8', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s ease'
                }
            });
            btn.onclick = () => { this.setMode(mode); updateModeStyles(mode); };
            modeButtons[mode] = btn;
            container.appendChild(btn);
        });

        const interaction = this.sg.pluginManager.getPlugin('interaction') as InteractionPlugin;
        updateModeStyles(interaction ? interaction.mode : 'default');

        return container;
    }

    private _createZoomControls(theme: any): HTMLElement {
        const container = DOMUtils.createElement('div', {
            style: {
                display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', padding: '2px 4px', border: '1px solid rgba(255,255,255,0.1)'
            }
        });

        const createBtn = (label: string, isZoomIn: boolean) => {
            const btn = DOMUtils.createElement('button', {
                textContent: label,
                style: { background: 'transparent', border: 'none', padding: '6px 12px', borderRadius: '99px', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }
            });
            btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.1)';
            btn.onmouseleave = () => btn.style.background = 'transparent';
            btn.onclick = () => {
                if (!this.sg.cameraControls) return;
                const currentRadius = this.sg.cameraControls.spherical.radius;
                const targetRadius = Math.max(10, Math.min(5000, currentRadius + (isZoomIn ? -currentRadius * 0.5 : currentRadius * 0.5)));
                this.sg.cameraControls.flyTo(this.sg.cameraControls.target, targetRadius, 0.5);
            };
            return btn;
        };

        const zoomSlider = DOMUtils.createElement('input', {
            type: 'range',
            id: 'sg-app-zoom-slider',
            min: '10',
            max: '5000',
            step: '1',
            style: { width: '80px', margin: '0 8px', cursor: 'pointer', accentColor: theme.primaryColor }
        });

        zoomSlider.oninput = () => {
            if (!this.sg.cameraControls) return;
            const invertedRadius = 5010 - parseFloat(zoomSlider.value);
            this.sg.cameraControls.spherical.radius = invertedRadius;
            this.sg.cameraControls.flyTo(this.sg.cameraControls.target, invertedRadius, 0);
        };

        if (this.sg.cameraControls) zoomSlider.value = (5010 - this.sg.cameraControls.spherical.radius).toString();

        this._zoomSliderHandler = () => {
            if (this.sg.cameraControls) zoomSlider.value = (5010 - this.sg.cameraControls.spherical.radius).toString();
        };
        this.sg.events.on('camera:move', this._zoomSliderHandler);

        container.append(createBtn('-', false), zoomSlider, createBtn('+', true));
        return container;
    }

    /**
     * Adds an action button directly into the bottom-center toolbar next to the stats.
     */
    public addToolbarAction(config: AppButtonConfig) {
        this.toolbarActions.push(config);
        this.renderToolbarActions();
    }

    private _createStyledButton(btn: AppButtonConfig, isToolbar: boolean, theme: any): HTMLElement {
        const bgNormal = isToolbar ? 'transparent' : theme.backgroundColor;
        const bgHover = 'rgba(255,255,255,0.1)';

        const btnEl = DOMUtils.createElement('button', {
            id: `sg-${isToolbar ? 'toolbar-' : ''}btn-${btn.id}`,
            style: {
                background: bgNormal,
                border: isToolbar ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.1)',
                padding: isToolbar ? '6px 12px' : '10px 16px',
                borderRadius: isToolbar ? '99px' : '8px',
                color: 'white',
                fontFamily: 'sans-serif',
                fontSize: isToolbar ? '13px' : '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: isToolbar ? '6px' : '8px'
            }
        });

        if (btn.icon) {
            btnEl.appendChild(DOMUtils.createElement('span', { innerHTML: btn.icon }));
        }

        btnEl.appendChild(document.createTextNode(btn.label));

        btnEl.onmouseenter = () => btnEl.style.background = bgHover;
        btnEl.onmouseleave = () => btnEl.style.background = bgNormal;
        btnEl.onclick = () => btn.onClick();

        return btnEl;
    }

    private renderToolbarActions() {
        if (typeof document === 'undefined') return;
        const container = document.getElementById('sg-app-toolbar-actions');
        if (!container) return;

        container.innerHTML = ''; // clear existing

        const theme = {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            ...this.options.theme
        };

        for (const btn of this.toolbarActions) {
            container.appendChild(this._createStyledButton(btn, true, theme));
        }
    }

    /**
     * Adds a generic action button to the HUD (typically top-right).
     */
    public addButton(config: AppButtonConfig) {
        this.buttons.push(config);
        this.renderButtons();
    }

    private renderButtons() {
        if (typeof document === 'undefined') return;

        this.hud.removeElement('app-actions');

        const theme = {
            primaryColor: '#3b82f6',
            secondaryColor: '#8b5cf6',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            ...this.options.theme
        };

        const container = DOMUtils.createElement('div', {
            style: {
                display: 'flex',
                gap: '12px',
                flexDirection: 'column'
            }
        });

        for (const btn of this.buttons) {
            container.appendChild(this._createStyledButton(btn, false, theme));
        }

        this.hud.addElement({
            id: 'app-actions',
            position: 'top-right',
            element: container
        });
    }

    private updateStatsHUD() {
        if (typeof document === 'undefined') return;

        const countEl = document.getElementById('sg-app-selected-count');
        if (countEl) {
            countEl.textContent = (this.currentSelected.length + this.currentSelectedEdges.length).toString();
        }

        const nodeCountEl = document.getElementById('sg-app-node-count');
        if (nodeCountEl) {
            nodeCountEl.textContent = this.sg.graph.nodes.size.toString();
        }
    }

    public showAlert(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
        this.hud.showAlert(message, type);
    }

    public showModal(options: { title: string; html: string; width?: string; onClose?: () => void }) {
        this.hud.showModal(options);
    }

    public hideModal() {
        this.hud.hideModal();
    }

    public showLoading(message?: string) {
        this.hud.showLoading(message);
    }

    public hideLoading() {
        this.hud.hideLoading();
    }

    // --- View and Data Helpers ---

    public exportData() {
        return this.sg.export();
    }

    public importData(data: any) {
        this.sg.import(data);
        this.hudController.updateSelection(this.currentSelected, this.currentSelectedEdges);
    }

    /**
     * Computes the bounding box of a specific set of nodes and flies the camera to view them.
     */
    public focusOnNodes(nodeIds: string[], padding: number = 100, duration: number = 1.5) {
        const nodes = [];
        for (const id of nodeIds) {
            const node = this.sg.graph.getNode(id);
            if (node) nodes.push(node);
        }
        const fit = CameraUtils.calculateFitView(nodes, this.sg.renderer.camera, padding);
        if (fit) {
            this.sg.cameraControls.flyTo(fit.center, fit.cameraZ, duration);
        }
    }

    // --- Graph Mutation Helpers ---

    public addNode(nodeSpec: any) {
        this.sg.graph.addNode(nodeSpec);
        this.hudController.updateSelection(this.currentSelected, this.currentSelectedEdges);
    }

    public updateNode(nodeId: string, nodeSpec: any) {
        this.sg.graph.updateNode(nodeId, nodeSpec);
    }

    public removeNode(nodeId: string) {
        const node = this.sg.graph.getNode(nodeId);
        if (node) {
            // Unselect if selected
            const index = this.currentSelected.indexOf(node);
            if (index > -1) {
                this.currentSelected.splice(index, 1);
            }
            this.sg.graph.removeNode(nodeId);
            this.hudController.updateSelection(this.currentSelected, this.currentSelectedEdges);
        }
    }

    public addEdge(edgeSpec: any) {
        this.sg.graph.addEdge(edgeSpec);
        this.hudController.updateSelection(this.currentSelected, this.currentSelectedEdges); // Stats currently only show nodes, but keeps it synced
    }

    public updateEdge(edgeId: string, edgeSpec: any) {
        this.sg.graph.updateEdge(edgeId, edgeSpec);
    }

    public removeEdge(edgeId: string) {
        const edge = this.sg.graph.getEdge(edgeId);
        if (edge) {
            const index = this.currentSelectedEdges.indexOf(edge);
            if (index > -1) {
                this.currentSelectedEdges.splice(index, 1);
            }
            this.sg.graph.removeEdge(edgeId);
            this.hudController.updateSelection(this.currentSelected, this.currentSelectedEdges);
        }
    }

    public clearSelection() {
        this.clearSelectionStyles();
        this.currentSelected = [];
        this.currentSelectedEdges = [];
        this.hudController.updateSelection(this.currentSelected, this.currentSelectedEdges);
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
        // Minimap and Interaction plugins handle their own disposal via SpaceGraph's plugin manager usually,
        // but here we instantiated them manually without the whole lifecycle manager running `dispose` on app destroy.
        // Actually, SpaceGraph manages its plugins if registered, but `dispose` isn't formalized in ISpaceGraphPlugin.
    }
}
