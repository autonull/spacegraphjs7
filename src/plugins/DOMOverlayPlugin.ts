import { BaseSystemPlugin } from './BaseSystemPlugin';
import { DOMUtils } from '../utils/DOMUtils';
import type { SpaceGraph } from '../SpaceGraph';
import type { Graph } from '../core/Graph';
import type { EventSystem } from '../core/events/EventSystem';

export interface DOMOverlayOptions {
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
}

export abstract class DOMOverlayPlugin extends BaseSystemPlugin {
    protected container: HTMLElement | null = null;

    init(sg: SpaceGraph, graph: Graph, events: EventSystem): void | Promise<void> {
        super.init(sg, graph, events);
        if (typeof document === 'undefined') return;
        this.createOverlay();
        this.attachOverlay();
    }

    protected abstract getOverlayOptions(): DOMOverlayOptions;

    protected createOverlay(): void {
        const options = this.getOverlayOptions();
        this.container = DOMUtils.createElement('div', {
            className: options.className,
            style: options.style,
        });
    }

    protected attachOverlay(): void {
        const renderer = this.sg?.renderer;
        if (!this.container || !renderer?.renderer?.domElement?.parentElement) return;
        const parent = renderer.renderer.domElement.parentElement as HTMLElement;
        parent.style.position = 'relative';
        parent.appendChild(this.container);
    }

  dispose(): void {
    if (this.container?.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    this.container = null;
    super.dispose?.();
  }
}
