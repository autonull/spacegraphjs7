import { DOMUtils } from '../../utils';
import type { SpaceGraph } from '../../SpaceGraph';
import { HUDDOMFactory } from './HUDDOMFactory';

export interface HUDElementSpec {
    className: string;
    style: Partial<CSSStyleDeclaration>;
    html?: string;
}

/** Owns the create/append/dispose lifecycle shared by every HUD region. */
export abstract class HUDElement {
    protected element: HTMLElement | null = null;

    constructor(protected readonly sg: SpaceGraph) {}

    create(): void {
        const { className, style, html } = this.spec();
        this.element = DOMUtils.createElement('div', { className, style });
        if (html !== undefined) this.element.innerHTML = html;
        HUDDOMFactory.appendToRenderer(this.sg, this.element);
    }

    dispose(): void {
        if (this.element?.parentElement) this.element.parentElement.removeChild(this.element);
        this.element = null;
    }

    protected abstract spec(): HUDElementSpec;
}
