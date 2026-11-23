import { requireElement } from 'spacegraphjs/utils';

export const el = <T extends HTMLElement>(id: string): T => requireElement<T>(id, 'pi app');

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
