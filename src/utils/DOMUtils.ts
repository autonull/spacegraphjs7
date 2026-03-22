export interface DOMElementOptions {
    id?: string;
    className?: string;
    innerHTML?: string;
    textContent?: string;
    style?: Partial<CSSStyleDeclaration>;
    type?: string;
    placeholder?: string;
    min?: string;
    max?: string;
    step?: string;
}

export class DOMUtils {
    /**
     * Helper to deeply deduplicate DOM element creation, styling, and property assignment.
     */
    static createElement<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        options: DOMElementOptions = {}
    ): HTMLElementTagNameMap[K] {
        const el = document.createElement(tag);

        if (options.id) el.id = options.id;
        if (options.className) el.className = options.className;
        if (options.innerHTML !== undefined) el.innerHTML = options.innerHTML;
        if (options.textContent !== undefined) el.textContent = options.textContent;

        // Type-specific attributes
        if (options.type && el instanceof HTMLInputElement) el.type = options.type;
        if (options.placeholder && el instanceof HTMLInputElement) el.placeholder = options.placeholder;
        if (options.min && el instanceof HTMLInputElement) el.min = options.min;
        if (options.max && el instanceof HTMLInputElement) el.max = options.max;
        if (options.step && el instanceof HTMLInputElement) el.step = options.step;

        if (options.style) {
            Object.assign(el.style, options.style);
        }

        return el;
    }

    /**
     * Helper to deeply deduplicate namespace DOM element creation.
     */
    static createElementNS(
        namespaceURI: string,
        qualifiedName: string,
        options: DOMElementOptions = {}
    ): SVGElement {
        const el = document.createElementNS(namespaceURI, qualifiedName) as SVGElement;

        if (options.id) el.id = options.id;
        if (options.className) el.setAttribute('class', options.className);
        if (options.innerHTML !== undefined) el.innerHTML = options.innerHTML;
        if (options.textContent !== undefined) el.textContent = options.textContent;

        if (options.style) {
            Object.assign(el.style, options.style);
        }

        return el;
    }
}
