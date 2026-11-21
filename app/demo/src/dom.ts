/** Rounds to two decimals for evidence text and SVG coordinates. */
export const round = (value: number): number => Math.round(value * 100) / 100;

/** Builds a typed `getElementById` accessor whose errors carry the host's label. */
export const elementGetter =
    (label: string) =>
    <T extends HTMLElement>(id: string): T => {
        const found = document.getElementById(id);
        if (!found) throw new Error(`${label}: missing #${id}`);
        return found as T;
    };
