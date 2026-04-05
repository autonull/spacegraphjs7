import { BaseSystemPlugin } from './BaseSystemPlugin';
import type { HUDElementOptions } from './hud/types';
import { HUDStatusBar } from './hud/HUDStatusBar';
import { HUDPerformanceMetrics } from './hud/HUDPerformanceMetrics';
import { HUDAlerts, type AlertOptions } from './hud/HUDAlerts';
import { HUD_ZINDEX, HUD_POSITIONS } from './hud/HUDStyles';
import { HUDDOMFactory } from './hud/HUDDOMFactory';
import { createLogger } from '../utils/logger';

const logger = createLogger('HUDPlugin');

export type { HUDElementOptions, AlertOptions };

export class HUDPlugin extends BaseSystemPlugin {
    readonly id = 'hud';
    readonly name = 'Heads Up Display';
    readonly version = '1.0.0';

    private container: HTMLElement | null = null;
    private statusBar: HUDStatusBar | null = null;
    private performanceMetrics: HUDPerformanceMetrics | null = null;
    private alerts: HUDAlerts | null = null;
    private elements: Map<string, { el: HTMLElement; options: HUDElementOptions }> = new Map();

    init(sg: SpaceGraph, graph: Graph, events: EventSystem): void {
        super.init(sg, graph, events);
        if (typeof document === 'undefined') return;

        this.createContainer();
        this.statusBar = new HUDStatusBar(sg);
        this.statusBar.create();

        this.performanceMetrics = new HUDPerformanceMetrics(sg);
        this.performanceMetrics.create();

        this.alerts = new HUDAlerts(sg);
        this.alerts.create();

        this.subscribeToEvents();
    }

    private createContainer(): void {
        this.container = HUDDOMFactory.createContainer(
            'spacegraph-hud',
            'spacegraph-hud-container',
        );
        this.container.style.inset = '0';
        this.container.style.zIndex = HUD_ZINDEX.HUD;
        HUDDOMFactory.appendToRenderer(this.sg, this.container);
    }

    private subscribeToEvents(): void {
        this.sg.events.on('node:added', () => this.updateNodeCount());
        this.sg.events.on('node:removed', () => this.updateNodeCount());
        this.sg.events.on('edge:added', () => this.updateNodeCount());
        this.sg.events.on('edge:removed', () => this.updateNodeCount());
        this.sg.events.on('selection:changed', (e: any) => this.updateSelection(e));
        this.sg.events.on('camera:moved', () => this.updateCamera());
    }

    private updateNodeCount(): void {
        this.statusBar?.updateNodeCount(this.sg.graph.getNodeCount(), this.sg.graph.getEdgeCount());
    }

    private updateSelection(e: any): void {
        const nodeCount = e.nodes?.size ?? 0;
        const edgeCount = e.edges?.size ?? 0;
        this.statusBar?.updateSelection(nodeCount, edgeCount);
    }

    private updateCamera(): void {
        const is3D = this.sg.renderer.camera.isPerspectiveCamera;
        this.statusBar?.updateCamera(is3D);
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

    showModal(_title: string, _content: string): void {
        logger.warn('showModal() not yet implemented in refactored version');
    }

    hideModal(): void {
        // Simplified modal
    }

    showLoading(_message: string): void {
        // Simplified loading
    }

    hideLoading(): void {
        // Simplified loading
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

    dispose(): void {
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
    }
}
