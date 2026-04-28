import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpaceGraphNodeData } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

export class ScrollPanelNode extends HtmlNode {
    private scrollContent: HTMLElement | null = null;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);
        this._setupScrollPanel();
    }

    private _setupScrollPanel(): void {
        const data = this.data as SpaceGraphNodeData;
        const direction = (data?.scrollDirection as 'vertical' | 'horizontal' | 'both') ?? 'vertical';
        this.domElement.style.overflow = 'auto';
        this._createScrollContent(direction);
    }

    private _createScrollContent(direction: 'vertical' | 'horizontal' | 'both'): void {
        const overflow = direction === 'both' ? 'auto' : direction;
        this.scrollContent = DOMUtils.createElement('div');
        Object.assign(this.scrollContent.style, {
            position: 'absolute', top: '0', left: '0', right: '0', bottom: '0',
            overflow, padding: '8px',
        });
        this.domElement.appendChild(this.scrollContent);
    }

    scrollTo(x: number, y: number, animate = true): void {
        if (!this.scrollContent) return;
        if (animate) {
            this.scrollContent.scrollTo({ top: y, left: x, behavior: 'smooth' });
        } else {
            this.scrollContent.scrollTop = y;
            this.scrollContent.scrollLeft = x;
        }
    }

    scrollToElement(element: HTMLElement, animate = true): void {
        if (!this.scrollContent || !element) return;
        element.scrollIntoView({ behavior: animate ? 'smooth' : 'auto', block: 'start', inline: 'start' });
    }

    getScrollPosition(): { x: number; y: number } {
        return {
            x: this.scrollContent?.scrollLeft ?? 0,
            y: this.scrollContent?.scrollTop ?? 0,
        };
    }
}