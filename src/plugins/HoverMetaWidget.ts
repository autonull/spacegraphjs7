import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { Plugin } from '../core/PluginManager';
import type { Graph } from '../core/Graph';
import type { EventSystem } from '../core/events/EventSystem';
import { DOMUtils } from '../utils/DOMUtils';

export interface MetaAction {
    /** Display character or short string shown on the button face */
    icon: string;
    /** Tooltip and screen-reader label */
    label: string;
    /** Identifier emitted with the 'node:metaaction' event */
    action: string;
}

export interface HoverMetaWidgetOptions {
    /**
     * Whether to show the widget by default.
     * Per-node override: set `node.data.metaWidget = false` to suppress
     * the widget for a specific node regardless of this setting.
     * Default: true
     */
    enabled?: boolean;

    /**
     * Milliseconds to wait after pointer leaves the node before hiding.
     * Gives the user time to move their mouse onto the toolbar buttons.
     * Default: 400
     */
    hideDelay?: number;

    /**
     * Milliseconds after the widget appears before it starts fading out.
     * Set to 0 to disable auto-fade entirely.
     * Default: 3500
     */
    fadeDelay?: number;

    /**
     * Duration of the fade-out CSS transition in milliseconds.
     * Default: 700
     */
    fadeDuration?: number;

    /**
     * Default toolbar actions used when a node does not supply its own
     * `data.hoverActions` array.
     */
    defaultActions?: MetaAction[];

    /**
     * Whether to draw the dashed bounding border around the node.
     * Default: true
     */
    showBorder?: boolean;

    /**
     * CSS border shorthand for the bounding outline.
     * Default: '1.5px dashed rgba(139, 92, 246, 0.75)'
     */
    borderStyle?: string;

    /** CSS border-radius for the bounding outline. Default: '10px' */
    borderRadius?: string;
}

const DEFAULT_ACTIONS: MetaAction[] = [
    { icon: '⤢', label: 'Focus', action: 'focus' },
    { icon: '⊕', label: 'Connect', action: 'connect' },
    { icon: '✕', label: 'Delete', action: 'delete' },
];

/**
 * HoverMetaWidget
 *
 * Renders a screen-space overlay around any hovered node (DOM-backed or pure-3D)
 * with a configurable toolbar of context action buttons.
 *
 * Key behaviours
 * ──────────────
 * • Works for ALL node types — DOMNode subclasses use getBoundingClientRect();
 *   pure-3D nodes (ShapeNode, ImageNode, …) use a Box3 world-space projection.
 * • hideDelay prevents the widget from vanishing the instant the mouse leaves
 *   the node and moves toward the toolbar.
 * • fadeDelay causes the widget to fade after a configurable idle period;
 *   moving the mouse back over the toolbar cancels the fade.
 * • Toolbar flips below the node when there is insufficient space above.
 * • Per-node opt-out: set `node.data.metaWidget = false`.
 *
 * Events fired on sg.events
 * ─────────────────────────
 * 'node:metaaction'  { node, action: string }   — button was clicked
 */
export class HoverMetaWidget implements Plugin {
    readonly id = 'hover-meta-widget';
    readonly name = 'Hover Meta Widget';
    readonly version = '1.0.0';

    private opts: Required<HoverMetaWidgetOptions>;

    private sg!: SpaceGraph;
    private overlay!: HTMLElement;
    private toolbar!: HTMLElement;
    private currentNode: any = null;

    // Timers
    private _hideTimer: ReturnType<typeof setTimeout> | null = null;
    private _fadeTimer: ReturnType<typeof setTimeout> | null = null;

    // Scratch vectors for 3D projection
    private _box = new THREE.Box3();
    private _va = new THREE.Vector3();
    private _vb = new THREE.Vector3();

    constructor(options: HoverMetaWidgetOptions = {}) {
        this.opts = {
            enabled: options.enabled ?? true,
            hideDelay: options.hideDelay ?? 400,
            fadeDelay: options.fadeDelay ?? 3500,
            fadeDuration: options.fadeDuration ?? 700,
            defaultActions: options.defaultActions ?? DEFAULT_ACTIONS,
            showBorder: options.showBorder ?? true,
            borderStyle: options.borderStyle ?? '1.5px dashed rgba(139, 92, 246, 0.75)',
            borderRadius: options.borderRadius ?? '10px',
        };
    }

    init(sg: SpaceGraph, _graph: Graph, _events: EventSystem): void {
        this.sg = sg;
        if (typeof document === 'undefined') return;

        // ── Overlay (bounding outline) ──────────────────────────────────────
        this.overlay = DOMUtils.createElement('div');
        this.overlay.className = 'sg-hover-meta-widget';
        Object.assign(this.overlay.style, {
            position: 'absolute',
            pointerEvents: 'none', // passes mouse events through to canvas/nodes
            display: 'none',
            boxSizing: 'border-box',
            border: this.opts.showBorder ? this.opts.borderStyle : 'none',
            borderRadius: this.opts.borderRadius,
            zIndex: '10000',
            transition: '',
            opacity: '1',
        });

        // ── Toolbar (buttons) ───────────────────────────────────────────────
        this.toolbar = DOMUtils.createElement('div');
        this.toolbar.className = 'sg-meta-toolbar';
        Object.assign(this.toolbar.style, {
            position: 'absolute',
            top: '-36px',
            left: '0',
            display: 'flex',
            gap: '4px',
            pointerEvents: 'auto', // buttons must be clickable
        });
        this.overlay.appendChild(this.toolbar);

        // Keep widget alive while mouse is over the toolbar
        this.toolbar.addEventListener('mouseenter', () => this._onToolbarEnter());
        this.toolbar.addEventListener('mouseleave', () => this._onToolbarLeave());

        const parent = sg.renderer.renderer.domElement.parentElement;
        if (parent) {
            parent.style.position = 'relative';
            parent.appendChild(this.overlay);
        }

        // ── SpaceGraph event hooks ──────────────────────────────────────────
        sg.events.on('node:pointerenter', ({ node }: { node: any }) => {
            if (!this.opts.enabled) return;
            if (node.data?.metaWidget === false) return;

            if (this.currentNode === node) {
                // Re-entering the same node — cancel any pending hide/fade
                this._cancelTimers();
                this._restoreOpacity();
                return;
            }

            this._cancelTimers();
            this.currentNode = node;
            this._showWidget(node);
        });

        sg.events.on('node:pointerleave', () => {
            this._startHideTimer();
        });

        // Drag suppresses the widget immediately (it would track the moving node
        // but that looks distracting; it reappears naturally on the next hover)
        sg.events.on('interaction:dragstart', () => {
            this._cancelTimers();
            this._hide();
        });

        sg.events.on('node:removed', ({ id }: { id: string }) => {
            if (this.currentNode?.id === id) {
                this._cancelTimers();
                this._hide();
            }
        });
    }

    onPreRender(): void {
        if (!this.currentNode || this.overlay.style.display === 'none') return;
        this._updatePosition(this.currentNode);
    }

    // ── Public helpers ────────────────────────────────────────────────────

    /** Programmatically hide the widget. */
    hide(): void {
        this._cancelTimers();
        this._hide();
    }

    // ── Private ───────────────────────────────────────────────────────────

    private _showWidget(node: any): void {
        const actions: MetaAction[] = node.data?.hoverActions ?? this.opts.defaultActions;

        // Rebuild toolbar buttons
        this.toolbar.innerHTML = '';
        for (const a of actions) {
            const btn = DOMUtils.createElement('button');
            btn.dataset.action = a.action;
            btn.title = a.label;
            btn.className = 'sg-meta-btn';
            btn.textContent = a.icon;
            Object.assign(btn.style, {
                background: 'rgba(15,23,42,0.95)',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '4px',
                width: '28px',
                height: '28px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0',
                lineHeight: '1',
                transition: 'background 0.1s, color 0.1s',
                userSelect: 'none',
            });

            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'rgba(139,92,246,0.35)';
                btn.style.color = '#e2e8f0';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'rgba(15,23,42,0.95)';
                btn.style.color = '#94a3b8';
            });
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleAction(node, a.action);
            });

            this.toolbar.appendChild(btn);
        }

        // Reset opacity & transition from any previous fade
        this._restoreOpacity();
        this.overlay.style.display = 'block';

        this._updatePosition(node);
        this._startFadeTimer();
    }

    private _handleAction(node: any, action: string): void {
        this.sg.events.emit('node:metaaction', { node, action });

        switch (action) {
            case 'focus':
                if (this.sg.cameraControls) {
                    const r = Math.max((node.data?.width ?? 200) * 1.5, 150);
                    this.sg.cameraControls.flyTo(node.position, r);
                }
                break;
            case 'delete':
                this._cancelTimers();
                this._hide();
                this.sg.graph.removeNode(node.id);
                break;
            case 'connect':
                this.sg.events.emit('interaction:requestconnect', { node });
                break;
        }
    }

    // ── Timer management ──────────────────────────────────────────────────

    private _startHideTimer(): void {
        this._cancelHideTimer();
        if (this.overlay.style.display === 'none') return;
        this._hideTimer = setTimeout(() => {
            this._hideTimer = null;
            this._hide();
        }, this.opts.hideDelay);
    }

    private _startFadeTimer(): void {
        this._cancelFadeTimer();
        if (this.opts.fadeDelay <= 0) return;
        this._fadeTimer = setTimeout(() => {
            this._fadeTimer = null;
            const ms = this.opts.fadeDuration;
            this.overlay.style.transition = `opacity ${ms}ms ease`;
            this.overlay.style.opacity = '0';
            // Disable toolbar pointer-events once fully faded so it doesn't
            // invisibly block the canvas.
            setTimeout(() => {
                if (this.overlay.style.opacity === '0') {
                    this.toolbar.style.pointerEvents = 'none';
                }
            }, ms);
        }, this.opts.fadeDelay);
    }

    private _cancelHideTimer(): void {
        if (this._hideTimer !== null) {
            clearTimeout(this._hideTimer);
            this._hideTimer = null;
        }
    }

    private _cancelFadeTimer(): void {
        if (this._fadeTimer !== null) {
            clearTimeout(this._fadeTimer);
            this._fadeTimer = null;
        }
    }

    private _cancelTimers(): void {
        this._cancelHideTimer();
        this._cancelFadeTimer();
    }

    private _restoreOpacity(): void {
        this.overlay.style.transition = '';
        this.overlay.style.opacity = '1';
        this.toolbar.style.pointerEvents = 'auto';
    }

    private _hide(): void {
        this.overlay.style.display = 'none';
        this.currentNode = null;
    }

    // ── Toolbar hover handlers ─────────────────────────────────────────────

    private _onToolbarEnter(): void {
        // Pointer moved from the node area into the toolbar — keep alive
        this._cancelTimers();
        this._restoreOpacity();
    }

    private _onToolbarLeave(): void {
        // Pointer left the toolbar — start hide countdown again
        this._startHideTimer();
        this._startFadeTimer();
    }

    // ── Position update (called every frame) ─────────────────────────────

    private _updatePosition(node: any): void {
        const parent = this.sg.renderer.renderer.domElement.parentElement;
        if (!parent) return;

        let left: number, top: number, width: number, height: number;

        if (node.domElement) {
            // DOM-backed node: CSS3D transform is already applied, so
            // getBoundingClientRect gives the exact screen rect.
            const rect = (node.domElement as HTMLElement).getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();
            left = rect.left - parentRect.left;
            top = rect.top - parentRect.top;
            width = rect.width;
            height = rect.height;
        } else {
            // Pure-3D node: compute world-space Box3 over all Meshes, then project.
            const camera = this.sg.renderer.camera;
            const canvas = this.sg.renderer.renderer.domElement;
            const cw = canvas.clientWidth;
            const ch = canvas.clientHeight;
            const parentRect = parent.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            const ox = canvasRect.left - parentRect.left;
            const oy = canvasRect.top - parentRect.top;

            this._box.makeEmpty();
            node.object.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.computeBoundingBox();
                    if (child.geometry.boundingBox) {
                        const wb = child.geometry.boundingBox
                            .clone()
                            .applyMatrix4(child.matrixWorld);
                        this._box.union(wb);
                    }
                }
            });

            if (this._box.isEmpty()) {
                // Fallback: sphere of radius 40 centred on node position
                const r = 40 * node.object.scale.x;
                this._box.setFromCenterAndSize(node.position, this._va.set(r * 2, r * 2, r * 2));
            }

            this._va.set(this._box.min.x, this._box.max.y, this._box.max.z).project(camera);
            this._vb.set(this._box.max.x, this._box.min.y, this._box.min.z).project(camera);

            const sx0 = ((this._va.x + 1) / 2) * cw + ox;
            const sy0 = (-(this._va.y - 1) / 2) * ch + oy;
            const sx1 = ((this._vb.x + 1) / 2) * cw + ox;
            const sy1 = (-(this._vb.y - 1) / 2) * ch + oy;

            left = Math.min(sx0, sx1);
            top = Math.min(sy0, sy1);
            width = Math.abs(sx1 - sx0);
            height = Math.abs(sy1 - sy0);
        }

        Object.assign(this.overlay.style, {
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
        });

        // Edge detection: flip toolbar below the node if it would clip above the parent
        const toolbarH = 36;
        const pad = 6;
        if (top < toolbarH + pad) {
            Object.assign(this.toolbar.style, { top: 'auto', bottom: `-${toolbarH}px` });
        } else {
            Object.assign(this.toolbar.style, { top: `-${toolbarH}px`, bottom: 'auto' });
        }
    }

    dispose(): void {
        this._cancelTimers();
        this.currentNode = null;
        if (this.overlay.parentElement) {
            this.overlay.parentElement.removeChild(this.overlay);
        }
    }
}
