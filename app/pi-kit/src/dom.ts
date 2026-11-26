/** DOM primitives shared by the Pi hosts. Missing required elements fail at the boundary. */
export const el = <T extends HTMLElement = HTMLElement>(id: string, label = 'app'): T => {
    const node = document.getElementById(id);
    if (!node) throw new Error(`missing element #${id} (${label})`);
    return node as T;
};
export type ButtonOptions = {
    className?: string;
    title?: string;
    dataset?: Record<string, string>;
};
export function button(
    label: string,
    onClick: () => void,
    options: ButtonOptions = {},
): HTMLButtonElement {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    if (options.className) element.className = options.className;
    if (options.title) element.title = options.title;
    for (const [key, value] of Object.entries(options.dataset ?? {})) element.dataset[key] = value;
    element.addEventListener('click', onClick);
    return element;
}
export function row(label: string, value?: string, tone?: string, title?: string): HTMLElement {
    const element = document.createElement('div');
    element.className = 'row';
    if (title) element.title = title;
    const name = document.createElement('span');
    name.className = 'label';
    name.textContent = label;
    element.append(name);
    if (value !== undefined) {
        const content = document.createElement('span');
        content.className = 'value';
        content.textContent = value;
        if (value.includes('\n')) content.style.whiteSpace = 'pre-line';
        if (tone) content.dataset['tone'] = tone;
        element.append(content);
    }
    return element;
}
/** The indexed child, created and appended on first use. */
export function ensureChild<T extends HTMLElement>(
    registry: Map<string, T>,
    id: string,
    parent: HTMLElement,
    create: () => T,
): T {
    let child = registry.get(id);
    if (!child) {
        child = create();
        parent.append(child);
        registry.set(id, child);
    }
    return child;
}
/** Removes indexed children no longer present in `live`. */
export function pruneChildren<T extends Element>(
    registry: Map<string, T>,
    live: ReadonlySet<string>,
): void {
    for (const [id, child] of registry) {
        if (live.has(id)) continue;
        child.remove();
        registry.delete(id);
    }
}
const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

export const escapeHTML = (value: string): string =>
    value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!);
export const dataText = (node: {
    readonly data?: Readonly<Record<string, unknown>>;
}): string => {
    const text = node.data?.['text'];
    return typeof text === 'string' ? text : '';
};
