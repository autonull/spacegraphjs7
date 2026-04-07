import * as THREE from 'three';
import type { SpaceGraph } from '../../SpaceGraph';
import type { Plugin } from '../../core/PluginManager';
import type { Graph } from '../../core/Graph';
import type { EventSystem } from '../../core/events/EventSystem';
import type { Node } from '../../nodes/Node';

export interface HoverAction {
    icon: string;
    label: string;
    action: string;
}

export interface HoverMetaWidgetOptions {
    enabled?: boolean;
    hideDelay?: number;
    fadeDelay?: number;
    fadeDuration?: number;
    showBorder?: boolean;
    borderStyle?: string;
    borderRadius?: string;
    defaultActions?: HoverAction[];
}

const DEFAULT_ACTIONS: HoverAction[] = [
    { icon: '⤢', label: 'Focus', action: 'focus' },
    { icon: '✕', label: 'Delete', action: 'delete' },
];

export class HoverMetaWidget implements Plugin {
    readonly id = 'hover-meta-widget';
    readonly name = 'Hover Meta Widget';
    readonly version = '1.0.0';

    opts: Required<HoverMetaWidgetOptions>;
    overlay: HTMLElement;
    buttonContainer: HTMLElement;
    private sg!: SpaceGraph;
    private hoveredNode: Node | null = null;
    private hideTimeout: ReturnType<typeof setTimeout> | null = null;
    private fadeTimeout: ReturnType<typeof setTimeout> | null = null;
    private isVisible = false;

    constructor(options: HoverMetaWidgetOptions = {}) {
        this.opts = {
            enabled: options.enabled ?? true,
            hideDelay: options.hideDelay ?? 400,
            fadeDelay: options.fadeDelay ?? 3500,
            fadeDuration: options.fadeDuration ?? 700,
            showBorder: options.showBorder ?? true,
            borderStyle: options.borderStyle ?? '2px dashed rgba(139, 92, 246, 0.75)',
            borderRadius: options.borderRadius ?? '10px',
            defaultActions: options.defaultActions ?? DEFAULT_ACTIONS,
        };

        this.overlay = document.createElement('div');
        Object.assign(this.overlay.style, {
            position: 'fixed',
            pointerEvents: 'auto',
            zIndex: '10000',
            display: 'none',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '8px',
            gap: '4px',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            transition: `opacity ${this.opts.fadeDuration}ms ease`,
            opacity: '1',
            border: this.opts.showBorder ? this.opts.borderStyle : 'none',
            borderRadius: this.opts.borderRadius,
        });

        this.buttonContainer = document.createElement('div');
        Object.assign(this.buttonContainer.style, {
            display: 'flex',
            gap: '4px',
        });
        this.overlay.appendChild(this.buttonContainer);
    }

    init(sg: SpaceGraph, _graph: Graph, _events: EventSystem): void {
        this.sg = sg;
        document.body.appendChild(this.overlay);

        sg.events.on('node:pointerenter', ({ node }: any) => {
            if (!this.opts.enabled) return;
            const nodeData = node.data as Record<string, unknown>;
            if (nodeData?.metaWidget === false) return;
            this.showForNode(node);
        });

        sg.events.on('node:pointerleave', () => {
            this.scheduleHide();
        });

        this.overlay.addEventListener('mouseenter', () => {
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
        });

        this.overlay.addEventListener('mouseleave', () => {
            this.scheduleHide();
        });

        this.startFadeTimer();
    }

    private showForNode(node: Node): void {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        this.hoveredNode = node;
        this.buildButtons(node);
        this.positionOverlay(node);

        if (!this.isVisible) {
            this.overlay.style.display = 'flex';
            this.overlay.style.opacity = '1';
            this.isVisible = true;
        }

        this.startFadeTimer();
    }

    private buildButtons(node: Node): void {
        this.buttonContainer.innerHTML = '';
        const nodeData = node.data as Record<string, unknown>;
        const actions: HoverAction[] =
            (nodeData?.hoverActions as HoverAction[]) ?? this.opts.defaultActions;

        for (const action of actions) {
            const btn = document.createElement('button');
            btn.title = action.label;
            Object.assign(btn.style, {
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background 0.15s',
            });
            btn.innerHTML = `<span>${action.icon}</span><span style="font-size:11px">${action.label}</span>`;
            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'rgba(139, 92, 246, 0.4)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'rgba(255, 255, 255, 0.1)';
            });
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.sg.events.emit('node:metaaction', { node, action: action.action });
                this.hide();
            });
            this.buttonContainer.appendChild(btn);
        }
    }

    private positionOverlay(node: Node): void {
        const pos = node.position.clone();
        pos.project(this.sg.renderer.camera);

        const rect = this.sg.renderer.renderer.domElement.getBoundingClientRect();
        const x = (pos.x * 0.5 + 0.5) * rect.width;
        const y = (-pos.y * 0.5 + 0.5) * rect.height;

        this.overlay.style.left = `${x - this.overlay.offsetWidth / 2}px`;
        this.overlay.style.top = `${y + 50}px`;
    }

    private scheduleHide(): void {
        if (this.hideTimeout) clearTimeout(this.hideTimeout);
        this.hideTimeout = setTimeout(() => this.hide(), this.opts.hideDelay);
    }

    private hide(): void {
        if (this.fadeTimeout) clearTimeout(this.fadeTimeout);
        this.overlay.style.opacity = '0';
        setTimeout(() => {
            this.overlay.style.display = 'none';
            this.isVisible = false;
        }, this.opts.fadeDuration);
        this.hoveredNode = null;
    }

    private startFadeTimer(): void {
        if (this.fadeTimeout) clearTimeout(this.fadeTimeout);
        if (this.opts.fadeDelay > 0) {
            this.fadeTimeout = setTimeout(() => {
                if (this.isVisible) {
                    this.overlay.style.opacity = '0.3';
                }
            }, this.opts.fadeDelay);
        }
    }

    dispose(): void {
        if (this.hideTimeout) clearTimeout(this.hideTimeout);
        if (this.fadeTimeout) clearTimeout(this.fadeTimeout);
        this.overlay.remove();
    }
}
