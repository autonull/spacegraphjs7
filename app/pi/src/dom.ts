import { requireElement } from 'spacegraphjs/utils';

export const el = <T extends HTMLElement>(id: string): T => requireElement<T>(id, 'pi app');

export type ButtonOptions = {
    className?: string;
    title?: string;
    dataset?: Record<string, string>;
};

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
