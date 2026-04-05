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

function applyElementOptions(el: Element, options: DOMElementOptions): void {
    if (options.id) el.id = options.id;
    if (options.className) el.setAttribute('class', options.className);
    if (options.innerHTML !== undefined) el.innerHTML = options.innerHTML;
    if (options.textContent !== undefined) el.textContent = options.textContent;

    if (options.style) {
        Object.assign((el as HTMLElement).style, options.style);
    }

    if (el instanceof HTMLInputElement) {
        if (options.type) el.type = options.type;
        if (options.placeholder) el.placeholder = options.placeholder;
        if (options.min) el.min = options.min;
        if (options.max) el.max = options.max;
        if (options.step) el.step = options.step;
    }
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options: DOMElementOptions = {},
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    applyElementOptions(el, options);
    return el;
}

export function createElementNS(
    namespaceURI: string,
    qualifiedName: string,
    options: DOMElementOptions = {},
): SVGElement {
    const el = document.createElementNS(namespaceURI, qualifiedName) as SVGElement;
    applyElementOptions(el, options);
    return el;
}
