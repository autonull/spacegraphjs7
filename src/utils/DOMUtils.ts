const FOCUSABLE_SELECTOR =
    'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Lists the enabled focusable descendants of a container in document order. */
export function focusableElements(container: ParentNode): HTMLElement[] {
    return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
        (element) => !element.hasAttribute('disabled'),
    );
}

/** Wraps Tab focus between the first and last focusable descendants of a dialog. */
export function trapTabKey(container: ParentNode, event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const focusable = focusableElements(container);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return event.preventDefault();
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

/** Looks up a required element by id, throwing with the given label when absent. */
export function requireElement<T extends HTMLElement = HTMLElement>(id: string, label = 'app'): T {
    const found = document.getElementById(id);
    if (!found) throw new Error(`${label}: missing #${id}`);
    return found as T;
}

const EDITABLE_SELECTOR =
    'input, textarea, select, .monaco-editor, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]';

/** Whether a keyboard event belongs to a control that handles its own keys. */
export function isEditableTarget(target: EventTarget | null): boolean {
    return !!(target as HTMLElement | null)?.closest?.(EDITABLE_SELECTOR);
}

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
    ariaLabel?: string;
    ariaPressed?: boolean;
    role?: string;
    title?: string;
}

function applyElementOptions(el: Element, options: DOMElementOptions): void {
    if (options.id) el.id = options.id;
    if (options.className) el.setAttribute('class', options.className);
    if (options.innerHTML !== undefined) el.innerHTML = options.innerHTML;
    if (options.textContent !== undefined) el.textContent = options.textContent;
    if (options.ariaLabel) el.setAttribute('aria-label', options.ariaLabel);
    if (options.role) el.setAttribute('role', options.role);
    if (options.ariaPressed !== undefined)
        el.setAttribute('aria-pressed', String(options.ariaPressed));
    if (options.title) el.setAttribute('title', options.title);

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

export const DOMUtils = { createElement, createElementNS };
