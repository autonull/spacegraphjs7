import { SpaceGraph, GraphSpec } from '../SpaceGraph';
import { HUDPlugin } from '../plugins/HUDPlugin';
import { InteractionPlugin } from '../plugins/InteractionPlugin';
import { MinimapPlugin } from '../plugins/MinimapPlugin';
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
            } else if (this.options.selectionHighlightColor && node.data?.color !== undefined) {
                // Save original color and apply highlight for WebGL nodes
                this.originalColors.set(node, node.data.color);
                node.updateSpec({ data: { color: this.options.selectionHighlightColor } });
            }
        });
    }

    private setupDefaultHUD(theme: any) {
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
        this.hud.addElement({
            id: 'app-toolbar',
            position: 'bottom-center',
            html: `
                <div style="background: ${theme.backgroundColor}; backdrop-filter: blur(8px); padding: 12px 24px; border-radius: 99px; border: 1px solid rgba(255,255,255,0.1); display: flex; gap: 24px; align-items: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); color: white; font-family: sans-serif;">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Nodes</span>
                        <span id="sg-app-node-count" style="font-size: 16px; font-weight: 700;">${this.sg.graph.nodes.size}</span>
                    </div>
                    <div style="width: 1px; height: 24px; background: rgba(255,255,255,0.1);"></div>
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Selected</span>
                        <span id="sg-app-selected-count" style="font-size: 16px; font-weight: 700; color: ${theme.primaryColor};">0</span>
                    </div>
                    <div style="width: 1px; height: 24px; background: rgba(255,255,255,0.1);"></div>
                    <button id="sg-app-fit-btn" style="background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor}); border: none; padding: 8px 16px; border-radius: 99px; color: white; font-weight: 600; cursor: pointer;">Fit View</button>
                </div>
            `
        });

        // Event listener for Fit View
        setTimeout(() => {
            const btn = document.getElementById('sg-app-fit-btn');
            if (btn) {
                btn.addEventListener('click', () => this.sg.fitView(200));
            }
            this.updateStatsHUD(); // initialize node count after load
        }, 100);
    }

    /**
     * Adds a generic action button to the HUD (typically top-right).
     */
    public addButton(config: AppButtonConfig) {
        this.buttons.push(config);
        this.renderButtons();
    }

    private renderButtons() {
        const theme = {
            primaryColor: '#3b82f6',
            secondaryColor: '#8b5cf6',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            ...this.options.theme
        };

        const buttonsHtml = this.buttons.map(btn => `
            <button id="sg-btn-${btn.id}" style="
                background: ${theme.backgroundColor};
                border: 1px solid rgba(255,255,255,0.1);
                padding: 10px 16px;
                border-radius: 8px;
                color: white;
                font-family: sans-serif;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                ${btn.icon ? `<span>${btn.icon}</span>` : ''}
                ${btn.label}
            </button>
        `).join('');

        this.hud.addElement({
            id: 'app-actions',
            position: 'top-right',
            html: `<div style="display: flex; gap: 12px; flex-direction: column;">${buttonsHtml}</div>`
        });

        // Wire up events after DOM injection
        setTimeout(() => {
            this.buttons.forEach(btn => {
                const el = document.getElementById(`sg-btn-${btn.id}`);
                if (el) {
                    el.onmouseenter = () => el.style.background = 'rgba(255,255,255,0.1)';
                    el.onmouseleave = () => el.style.background = theme.backgroundColor;
                    el.onclick = () => btn.onClick();
                }
            });
        }, 10);
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

    public dispose() {
        this.hud.dispose();
        // Minimap and Interaction plugins handle their own disposal via SpaceGraph's plugin manager usually,
        // but here we instantiated them manually without the whole lifecycle manager running `dispose` on app destroy.
        // Actually, SpaceGraph manages its plugins if registered, but `dispose` isn't formalized in ISpaceGraphPlugin.
    }
}
