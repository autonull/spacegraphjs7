import type { SelectionChangedPayload } from '../types';
import { trapTabKey } from '../utils/DOMUtils';
import { BaseSystemPlugin } from './BaseSystemPlugin';
import { type AlertOptions, HUDAlerts } from './hud/HUDAlerts';
import { HUDDOMFactory } from './hud/HUDDOMFactory';
import { HUDPerformanceMetrics } from './hud/HUDPerformanceMetrics';
import { HUDStatusBar } from './hud/HUDStatusBar';
import { HUD_COLORS, HUD_POSITIONS, HUD_STYLES, HUD_ZINDEX } from './hud/HUDStyles';
import type { HUDElementOptions } from './hud/types';

export type { AlertOptions, HUDElementOptions };

export interface ModalOptions {
    width?: string;
    onClose?: () => void;
}

export class HUDPlugin extends BaseSystemPlugin {
    readonly id = 'hud';
    readonly name = 'Heads Up Display';

    private container: HTMLElement | null = null;
    private statusBar: HUDStatusBar | null = null;
    private performanceMetrics: HUDPerformanceMetrics | null = null;
    private alerts: HUDAlerts | null = null;
    private modal: HTMLElement | null = null;
    private modalClose: (() => void) | null = null;
    private modalKeyHandler: ((event: KeyboardEvent) => void) | null = null;
    private modalFocusReturn: HTMLElement | null = null;
    private loading: HTMLElement | null = null;
    private tooltip: HTMLElement | null = null;
    private contextMenu: HTMLElement | null = null;
    private dismissMenu: ((event: PointerEvent) => void) | null = null;
    private contextMenuKeyHandler: ((event: KeyboardEvent) => void) | null = null;
    private elements: Map<string, { el: HTMLElement; options: HUDElementOptions }> = new Map();

    protected onInit(): void {
        if (typeof document === 'undefined') return;

        this.createContainer();
        this.statusBar = new HUDStatusBar(this.sg);
        this.statusBar.create();

        this.performanceMetrics = new HUDPerformanceMetrics(this.sg);
        this.performanceMetrics.create();

        this.alerts = new HUDAlerts(this.sg);
        this.alerts.create();

        this.subscribeToEvents();

        // Initial update
        this.updateNodeCount();
        this.updateCamera();
    }

    addElement(options: HUDElementOptions): void {
        if (typeof document === 'undefined') return;

        const element = options.element ?? HUDDOMFactory.createInteractiveContainer(options.id);

        if (options.html && !options.element) {
            element.innerHTML = options.html;
        }

        if (options.style) {
            HUDDOMFactory.applyStyles(element, options.style);
        }

        this.applyPosition(element, options.position);
        HUDDOMFactory.appendToRenderer(this.sg, element);

        this.elements.set(options.id, { el: element, options });
    }

    updateElement(id: string, options: Partial<HUDElementOptions>): void {
        const existing = this.elements.get(id);
        if (!existing) return;

        if (options.html) existing.el.innerHTML = options.html;
        if (options.style) HUDDOMFactory.applyStyles(existing.el, options.style);
        if (options.position) this.applyPosition(existing.el, options.position);
    }

    removeElement(id: string): void {
        const existing = this.elements.get(id);
        if (!existing) return;

        if (existing.el.parentElement) {
            existing.el.parentElement.removeChild(existing.el);
        }
        this.elements.delete(id);
    }

    getElement(id: string): HTMLElement | undefined {
        return this.elements.get(id)?.el;
    }

    applyPosition(element: HTMLElement, position: HUDElementOptions['position']): void {
        const posKey = position as keyof typeof HUD_POSITIONS;
        const styles = HUD_POSITIONS[posKey];
        HUDDOMFactory.applyStyles(element, styles as Partial<CSSStyleDeclaration>);
    }

    showAlert(options: AlertOptions | string): void {
        this.alerts?.show(options);
    }

    showModal(title: string, content: string, options: ModalOptions = {}): void {
        this.hideModal();
        this.modalFocusReturn =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const overlay = document.createElement('div');
        overlay.id = 'spacegraph-modal-overlay';
        Object.assign(overlay.style, {
            position: 'absolute',
            inset: '0',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: HUD_ZINDEX.MODAL,
        });
        const panel = document.createElement('div');
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.tabIndex = -1;
        Object.assign(panel.style, {
            width: options.width ?? 'min(420px, calc(100% - 32px))',
            maxWidth: 'calc(100% - 32px)',
            maxHeight: 'calc(100% - 32px)',
            overflow: 'auto',
            padding: '20px',
            background: HUD_COLORS.surface,
            border: `1px solid ${HUD_COLORS.border}`,
            borderRadius: '8px',
        });
        const heading = document.createElement('h2');
        heading.id = 'spacegraph-modal-title';
        heading.textContent = title;
        panel.setAttribute('aria-labelledby', heading.id);
        const body = document.createElement('div');
        body.innerHTML = content;
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = 'Close';
        close.onclick = () => this.hideModal();
        panel.append(heading, body, close);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) this.hideModal();
        });
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                this.hideModal();
                return;
            }
            trapTabKey(panel, event);
        };
        overlay.addEventListener('keydown', onKeyDown);
        overlay.append(panel);
        HUDDOMFactory.appendToRenderer(this.sg, overlay);
        this.modal = overlay;
        this.modalKeyHandler = onKeyDown;
        this.modalClose = options.onClose ?? null;
        close.focus();
    }

    hideModal(): void {
        if (!this.modal) return;
        if (this.modalKeyHandler) {
            this.modal.removeEventListener('keydown', this.modalKeyHandler);
            this.modalKeyHandler = null;
        }
        this.modal.remove();
        this.modal = null;
        const returnTo = this.modalFocusReturn;
        this.modalFocusReturn = null;
        if (returnTo?.isConnected) returnTo.focus();
        const onClose = this.modalClose;
        this.modalClose = null;
        onClose?.();
    }

    showLoading(message: string): void {
        this.hideLoading();
        const notice = document.createElement('div');
        notice.id = 'spacegraph-loading';
        notice.setAttribute('role', 'status');
        notice.setAttribute('aria-live', 'polite');
        notice.textContent = message;
        Object.assign(notice.style, {
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: 'calc(100% - 32px)',
            padding: '10px 16px',
            background: HUD_COLORS.surface,
            border: `1px solid ${HUD_COLORS.border}`,
            borderRadius: '8px',
            zIndex: HUD_ZINDEX.LOADING,
        });
        HUDDOMFactory.appendToRenderer(this.sg, notice);
        this.loading = notice;
    }

    hideLoading(): void {
        this.loading?.remove();
        this.loading = null;
    }

    showTooltip(
        element: HTMLElement,
        content: string | HTMLElement,
        at?: { clientX: number; clientY: number },
    ): void {
        this.hideTooltip();
        const tooltip = document.createElement('div');
        tooltip.id = 'spacegraph-tooltip';
        Object.assign(tooltip.style, {
            ...HUD_STYLES.base,
            background: HUD_COLORS.surface,
            border: `1px solid ${HUD_COLORS.border}`,
            borderRadius: '6px',
            padding: '6px 8px',
            fontSize: '12px',
            whiteSpace: 'pre-line',
            maxWidth: '320px',
            pointerEvents: 'none',
            zIndex: HUD_ZINDEX.TOOLTIP,
        });
        if (typeof content === 'string') tooltip.textContent = content;
        else tooltip.appendChild(content);
        HUDDOMFactory.appendToRenderer(this.sg, tooltip);
        this.place(tooltip, at?.clientX, at?.clientY, element);
        this.tooltip = tooltip;
    }

    hideTooltip(): void {
        this.tooltip?.remove();
        this.tooltip = null;
    }

    showContextMenu(
        x: number,
        y: number,
        items: Array<{ label: string; action: () => void }>,
    ): void {
        this.hideContextMenu();
        const menu = document.createElement('div');
        menu.id = 'spacegraph-context-menu';
        menu.setAttribute('role', 'menu');
        Object.assign(menu.style, {
            ...HUD_STYLES.base,
            background: HUD_COLORS.surface,
            border: `1px solid ${HUD_COLORS.border}`,
            borderRadius: '8px',
            padding: '4px',
            minWidth: '140px',
            pointerEvents: 'auto',
            zIndex: HUD_ZINDEX.CONTEXT_MENU,
        });
        for (const item of items) {
            const button = HUDDOMFactory.createButton(item.label, () => {
                this.hideContextMenu();
                item.action();
            });
            button.setAttribute('role', 'menuitem');
            button.style.display = 'block';
            button.style.width = '100%';
            menu.appendChild(button);
        }
        const onKeyDown = (event: KeyboardEvent) => {
            const buttons = [...menu.querySelectorAll<HTMLButtonElement>('button')];
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
            if (event.key === 'Escape') {
                event.stopPropagation();
                this.hideContextMenu();
                return;
            }
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            buttons[(index + step + buttons.length) % buttons.length]?.focus();
        };
        menu.addEventListener('keydown', onKeyDown);
        HUDDOMFactory.appendToRenderer(this.sg, menu);
        this.place(menu, x, y, menu);
        this.contextMenu = menu;
        this.contextMenuKeyHandler = onKeyDown;
        menu.querySelector<HTMLButtonElement>('button')?.focus();
        this.dismissMenu = (event) => {
            if (!menu.contains(event.target as Node)) this.hideContextMenu();
        };
        document.addEventListener('pointerdown', this.dismissMenu, true);
    }

    hideContextMenu(): void {
        if (this.dismissMenu) document.removeEventListener('pointerdown', this.dismissMenu, true);
        this.dismissMenu = null;
        if (this.contextMenuKeyHandler)
            this.contextMenu?.removeEventListener('keydown', this.contextMenuKeyHandler);
        this.contextMenuKeyHandler = null;
        this.contextMenu?.remove();
        this.contextMenu = null;
    }

    private place(element: HTMLElement, x?: number, y?: number, anchor?: HTMLElement): void {
        const parent = anchor?.parentElement ?? element.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        const left = x === undefined ? 12 : x - rect.left + 12;
        const top = y === undefined ? 12 : y - rect.top + 12;
        element.style.left = `${Math.max(8, Math.min(left, parent.clientWidth - element.offsetWidth - 8))}px`;
        element.style.top = `${Math.max(8, Math.min(top, parent.clientHeight - element.offsetHeight - 8))}px`;
    }

    onPostRender(): void {
        this.performanceMetrics?.tick();
    }

    dispose(): void {
        this.hideModal();
        this.hideLoading();
        this.hideTooltip();
        this.hideContextMenu();
        this.statusBar?.dispose();
        this.performanceMetrics?.dispose();
        this.alerts?.dispose();

        for (const { el } of this.elements.values()) {
            if (el.parentElement) {
                el.parentElement.removeChild(el);
            }
        }
        this.elements.clear();

        if (this.container?.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
        super.dispose();
    }

    private createContainer(): void {
        this.container = HUDDOMFactory.createOverlay('spacegraph-hud', HUD_ZINDEX.HUD);
        this.container.className = 'spacegraph-hud-container';
        HUDDOMFactory.appendToRenderer(this.sg, this.container);
    }

    private subscribeToEvents(): void {
        this.on('node:added', () => this.updateNodeCount());
        this.on('node:removed', () => this.updateNodeCount());
        this.on('edge:added', () => this.updateNodeCount());
        this.on('edge:removed', () => this.updateNodeCount());
        this.on('selection:changed', (e) => this.updateSelection(e));
        this.on('projection:change', () => this.updateCamera());
        this.on('fractal:level-change', (e: any) => this.updateFractalLevel(e));
        this.on('fractal:transition-progress', (p: number) => this.updateFractalProgress(p));
    }

    private updateNodeCount(): void {
        this.statusBar?.updateNodeCount(this.sg.graph.nodeCount, this.sg.graph.edgeCount);
    }

    private updateSelection(e: SelectionChangedPayload): void {
        this.statusBar?.updateSelection(e.nodes.size, e.edges.size);
    }

    private updateCamera(): void {
        const is3D =
            (this.sg.renderer.camera as { isPerspectiveCamera?: boolean }).isPerspectiveCamera ===
            true;
        this.statusBar?.updateCamera(is3D);
    }

    private updateFractalLevel(data: any): void {
        const indicator = document.getElementById('level-text');
        if (indicator) {
            indicator.textContent = data.label;
            indicator.style.color = HUD_COLORS.primary;
            setTimeout(() => {
                indicator.style.color = '#fff';
            }, 500);
        }
    }

    private updateFractalProgress(progress: number): void {
        let bar = document.getElementById('fractal-zoom-progress');
        if (!bar) {
            const indicator = document.querySelector('.fractal-level-indicator');
            if (!indicator) return;
            const track = document.createElement('div');
            track.style.cssText =
                'height:4px;background:rgba(255,255,255,.1);border-radius:2px;margin-top:10px;overflow:hidden';
            bar = document.createElement('div');
            bar.id = 'fractal-zoom-progress';
            bar.style.cssText = `height:100%;width:0;background:${HUD_COLORS.primary};transition:width .1s ease`;
            track.appendChild(bar);
            indicator.appendChild(track);
        }
        const progressBar = bar;
        progressBar.style.width = `${progress * 100}%`;
        if (progress >= 1 || progress <= 0) {
            setTimeout(() => {
                progressBar.style.width = '0%';
            }, 200);
        }
    }
}
