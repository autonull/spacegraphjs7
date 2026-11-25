import type { SelectionChangedPayload } from '../types';
import { BaseSystemPlugin } from './BaseSystemPlugin';
import { type AlertOptions, HUDAlerts } from './hud/HUDAlerts';
import { HUDDOMFactory } from './hud/HUDDOMFactory';
import { HUDPerformanceMetrics } from './hud/HUDPerformanceMetrics';
import { HUDStatusBar } from './hud/HUDStatusBar';
import { HUD_COLORS, HUD_POSITIONS, HUD_ZINDEX } from './hud/HUDStyles';
import type { HUDElementOptions } from './hud/types';

export type { AlertOptions, HUDElementOptions };

export class HUDPlugin extends BaseSystemPlugin {
    readonly id = 'hud';
    readonly name = 'Heads Up Display';

    private container: HTMLElement | null = null;
    private statusBar: HUDStatusBar | null = null;
    private performanceMetrics: HUDPerformanceMetrics | null = null;
    private alerts: HUDAlerts | null = null;
    private modal: HTMLElement | null = null;
    private loading: HTMLElement | null = null;
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

    showModal(title: string, content: string): void {
        this.hideModal();
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
        Object.assign(panel.style, {
            maxWidth: 'min(420px, calc(100% - 32px))',
            maxHeight: 'calc(100% - 32px)',
            overflow: 'auto',
            padding: '20px',
            background: HUD_COLORS.surface,
            border: `1px solid ${HUD_COLORS.border}`,
            borderRadius: '8px',
        });
        const heading = document.createElement('h2');
        heading.textContent = title;
        const body = document.createElement('div');
        body.innerHTML = content;
        const close = document.createElement('button');
        close.textContent = 'Close';
        close.onclick = () => this.hideModal();
        panel.append(heading, body, close);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) this.hideModal();
        });
        overlay.append(panel);
        HUDDOMFactory.appendToRenderer(this.sg, overlay);
        this.modal = overlay;
    }

    hideModal(): void {
        this.modal?.remove();
        this.modal = null;
    }

    showLoading(message: string): void {
        this.hideLoading();
        const notice = document.createElement('div');
        notice.id = 'spacegraph-loading';
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

    showTooltip(_element: HTMLElement, _content: string): void {
        // Simplified tooltip
    }

    hideTooltip(): void {
        // Simplified tooltip
    }

    showContextMenu(
        _x: number,
        _y: number,
        _items: Array<{ label: string; action: () => void }>,
    ): void {
        // Simplified context menu
    }

    hideContextMenu(): void {
        // Simplified context menu
    }

    onPostRender(): void {
        this.performanceMetrics?.tick();
    }

    dispose(): void {
        this.hideModal();
        this.hideLoading();
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
