import type { Trail } from 'spacegraphjs/navigation';
import { requireElement } from 'spacegraphjs/utils';

/** Rounds to two decimals for evidence text and SVG coordinates. */
export const round = (value: number): number => Math.round(value * 100) / 100;

/** Builds a typed `getElementById` accessor whose errors carry the host's label. */
export const elementGetter =
    (label: string) =>
    <T extends HTMLElement>(id: string): T =>
        requireElement<T>(id, label);

/** Paints a navigation trail as a Back control plus one button per entry. */
export const renderTrail = (
    nav: HTMLElement,
    trail: Trail,
    onBack: () => void,
    onSelect: (id: string) => void,
): void => {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'trail-back';
    back.textContent = 'Back';
    back.disabled = !trail.canGoBack;
    back.dataset.role = 'trail-back';
    back.addEventListener('click', onBack);

    const crumbs = trail.entries.map((entry) => {
        const crumb = document.createElement('button');
        crumb.type = 'button';
        crumb.className = 'crumb';
        crumb.textContent = entry.label ?? entry.id;
        crumb.dataset.id = entry.id;
        if (trail.current?.id === entry.id) crumb.setAttribute('aria-current', 'true');
        crumb.addEventListener('click', () => onSelect(entry.id));
        return crumb;
    });

    nav.replaceChildren(back, ...crumbs);
};
