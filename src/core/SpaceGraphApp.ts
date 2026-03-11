import { SpaceGraph, GraphSpec } from '../SpaceGraph';
import { HUDPlugin } from '../plugins/HUDPlugin';
import { InteractionPlugin } from '../plugins/InteractionPlugin';
import { MinimapPlugin } from '../plugins/MinimapPlugin';
import * as THREE from 'three';
import { HtmlNode } from '../nodes/HtmlNode';

export interface SpaceGraphAppOptions {
    spec?: GraphSpec;
    title?: string;
    description?: string;
    enableMinimap?: boolean;
    enableInteraction?: boolean;
    selectionHighlightClass?: string;
    selectionHighlightColor?: number;
    theme?: {
        primaryColor?: string;
        secondaryColor?: string;
        backgroundColor?: string;
    };
    onNodeSelect?: (nodes: any[]) => void;
    onNodeDblClick?: (node: any) => void;
    nodeContextMenu?: (node: any) => Array<{ label: string; action: () => void }>;
    graphContextMenu?: () => Array<{ label: string; action: () => void }>;
    nodeTooltip?: (node: any) => string | HTMLElement;
    enableGrid?: boolean;
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
    private originalColors = new Map<any, number>();
    private buttons: AppButtonConfig[] = [];
    private toolbarActions: AppButtonConfig[] = [];

    constructor(container: HTMLElement | string, options: SpaceGraphAppOptions = {}) {
        this.options = {
            enableMinimap: true,
            enableInteraction: true,
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

        // Create the base SpaceGraph instance
        this.sg = SpaceGraph.create(container, this.options.spec);

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
    }

    private setupInteractionHandlers() {
        // Selection handling
        this.sg.events.on('interaction:selection', ({ nodes }) => {
            this.clearSelectionStyles();
            this.currentSelected = nodes;
            this.applySelectionStyles();
            this.updateStatsHUD();

            if (this.options.onNodeSelect) {
                this.options.onNodeSelect(this.currentSelected);
            }
        });

        // Click on background clears selection
        this.sg.events.on('graph:click', () => {
            this.clearSelectionStyles();
            this.currentSelected = [];
            this.updateStatsHUD();

            if (this.options.onNodeSelect) {
                this.options.onNodeSelect([]);
            }
        });

        // Node click handling
        this.sg.events.on('node:click', ({ node }) => {
            this.clearSelectionStyles();
            this.currentSelected = [node];
            this.applySelectionStyles();
            this.updateStatsHUD();

            if (this.options.onNodeSelect) {
                this.options.onNodeSelect(this.currentSelected);
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

        // Context Menus
        this.sg.events.on('node:contextmenu', ({ node, event }) => {
            if (this.options.nodeContextMenu) {
                const items = this.options.nodeContextMenu(node);
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
    }

    private clearSelectionStyles() {
        this.currentSelected.forEach(node => {
            if (node instanceof HtmlNode && this.options.selectionHighlightClass) {
                node.domElement.classList.remove(this.options.selectionHighlightClass);
            } else if (this.options.selectionHighlightColor && this.originalColors.has(node)) {
                // Restore original color for WebGL nodes
                node.updateSpec({ data: { color: this.originalColors.get(node) } });
            }
        });
        this.originalColors.clear();
    }

    private applySelectionStyles() {
        this.currentSelected.forEach(node => {
            if (node instanceof HtmlNode && this.options.selectionHighlightClass) {
                node.domElement.classList.add(this.options.selectionHighlightClass);
            } else if (this.options.selectionHighlightColor && node.data?.color !== undefined && typeof node.updateSpec === 'function') {
                // Save original color and apply highlight for WebGL nodes
                this.originalColors.set(node, node.data.color);
                node.updateSpec({ data: { color: this.options.selectionHighlightColor } });
            }
        });
    }

    private setupDefaultHUD(theme: any) {
        if (typeof document === 'undefined') return;

        // App Title
        if (this.options.title) {
            this.hud.addElement({
                id: 'app-title-card',
                position: 'top-left',
                html: `
                    <div style="background: ${theme.backgroundColor}; backdrop-filter: blur(8px); padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); width: 300px; color: white; font-family: sans-serif;">
                        <h1 style="font-size: 18px; margin: 0 0 8px 0; background: -webkit-linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor}); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${this.options.title}</h1>
                        ${this.options.description ? `<p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">${this.options.description}</p>` : ''}
                    </div>
                `
            });
        }

        // Stats Bar & Controls
        const toolbarContainer = document.createElement('div');
        Object.assign(toolbarContainer.style, {
            background: theme.backgroundColor,
            backdropFilter: 'blur(8px)',
            padding: '12px 24px',
            borderRadius: '99px',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: '24px',
            alignItems: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            color: 'white',
            fontFamily: 'sans-serif'
        });

        // Nodes Stat
        const nodesStat = document.createElement('div');
        Object.assign(nodesStat.style, { display: 'flex', flexDirection: 'column', alignItems: 'center' });
        nodesStat.innerHTML = `<span style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Nodes</span><span id="sg-app-node-count" style="font-size: 16px; font-weight: 700;">${this.sg.graph.nodes.size}</span>`;
        toolbarContainer.appendChild(nodesStat);

        const divider1 = document.createElement('div');
        Object.assign(divider1.style, { width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' });
        toolbarContainer.appendChild(divider1);

        // Selected Stat
        const selectedStat = document.createElement('div');
        Object.assign(selectedStat.style, { display: 'flex', flexDirection: 'column', alignItems: 'center' });
        selectedStat.innerHTML = `<span style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Selected</span><span id="sg-app-selected-count" style="font-size: 16px; font-weight: 700; color: ${theme.primaryColor};">0</span>`;
        toolbarContainer.appendChild(selectedStat);

        const divider2 = document.createElement('div');
        Object.assign(divider2.style, { width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' });
        toolbarContainer.appendChild(divider2);

        // Fit View Button
        const fitBtn = document.createElement('button');
        Object.assign(fitBtn.style, {
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
            border: 'none',
            padding: '8px 16px',
            borderRadius: '99px',
            color: 'white',
            fontWeight: '600',
            cursor: 'pointer'
        });
        fitBtn.textContent = 'Fit View';
        fitBtn.addEventListener('click', () => this.sg.fitView(200));
        toolbarContainer.appendChild(fitBtn);

        // Zoom Controls Container
        const zoomContainer = document.createElement('div');
        Object.assign(zoomContainer.style, {
            display: 'flex',
            gap: '2px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '99px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)'
        });

        const createZoomBtn = (label: string, isZoomIn: boolean) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            Object.assign(btn.style, {
                background: 'transparent', border: 'none', padding: '6px 12px',
                color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer'
            });
            btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.1)';
            btn.onmouseleave = () => btn.style.background = 'transparent';
            btn.onclick = () => {
                if (!this.sg.cameraControls) return;
                const currentRadius = this.sg.cameraControls.spherical.radius;
                const zoomFactor = 0.5; // adjust relative to distance
                const delta = isZoomIn ? -(currentRadius * zoomFactor) : (currentRadius * zoomFactor);
                const targetRadius = Math.max(10, Math.min(5000, currentRadius + delta));
                this.sg.cameraControls.flyTo(this.sg.cameraControls.target, targetRadius, 0.5);
            };
            return btn;
        };

        zoomContainer.appendChild(createZoomBtn('-', false));
        zoomContainer.appendChild(createZoomBtn('+', true));
        toolbarContainer.appendChild(zoomContainer);

        // Toolbar Actions Container
        const actionsContainer = document.createElement('div');
        actionsContainer.id = 'sg-app-toolbar-actions';
        Object.assign(actionsContainer.style, {
            display: 'flex',
            gap: '12px'
        });
        toolbarContainer.appendChild(actionsContainer);

        this.hud.addElement({
            id: 'app-toolbar',
            position: 'bottom-center',
            element: toolbarContainer
        });

        this.updateStatsHUD(); // initialize node count after load
        this.renderToolbarActions();
    }

    /**
     * Adds an action button directly into the bottom-center toolbar next to the stats.
     */
    public addToolbarAction(config: AppButtonConfig) {
        this.toolbarActions.push(config);
        this.renderToolbarActions();
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

        this.toolbarActions.forEach(btn => {
            const btnEl = document.createElement('button');
            btnEl.id = `sg-toolbar-btn-${btn.id}`;
            Object.assign(btnEl.style, {
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '6px 12px',
                borderRadius: '99px',
                color: 'white',
                fontFamily: 'sans-serif',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            });

            if (btn.icon) {
                const iconSpan = document.createElement('span');
                iconSpan.innerHTML = btn.icon;
                btnEl.appendChild(iconSpan);
            }

            const labelNode = document.createTextNode(btn.label);
            btnEl.appendChild(labelNode);

            btnEl.onmouseenter = () => btnEl.style.background = 'rgba(255,255,255,0.1)';
            btnEl.onmouseleave = () => btnEl.style.background = 'transparent';
            btnEl.onclick = () => btn.onClick();

            container.appendChild(btnEl);
        });
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

        const theme = {
            primaryColor: '#3b82f6',
            secondaryColor: '#8b5cf6',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            ...this.options.theme
        };

        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            gap: '12px',
            flexDirection: 'column'
        });

        this.buttons.forEach(btn => {
            const btnEl = document.createElement('button');
            btnEl.id = `sg-btn-${btn.id}`;
            Object.assign(btnEl.style, {
                background: theme.backgroundColor,
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '10px 16px',
                borderRadius: '8px',
                color: 'white',
                fontFamily: 'sans-serif',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            });

            if (btn.icon) {
                const iconSpan = document.createElement('span');
                iconSpan.innerHTML = btn.icon;
                btnEl.appendChild(iconSpan);
            }

            const labelNode = document.createTextNode(btn.label);
            btnEl.appendChild(labelNode);

            btnEl.onmouseenter = () => btnEl.style.background = 'rgba(255,255,255,0.1)';
            btnEl.onmouseleave = () => btnEl.style.background = theme.backgroundColor;
            btnEl.onclick = () => btn.onClick();

            container.appendChild(btnEl);
        });

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
            countEl.textContent = this.currentSelected.length.toString();
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

    public dispose() {
        this.hud.dispose();
        // Minimap and Interaction plugins handle their own disposal via SpaceGraph's plugin manager usually,
        // but here we instantiated them manually without the whole lifecycle manager running `dispose` on app destroy.
        // Actually, SpaceGraph manages its plugins if registered, but `dispose` isn't formalized in ISpaceGraphPlugin.
    }
}
