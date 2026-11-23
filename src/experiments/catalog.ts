/** Host-neutral catalog descriptors. Links and labels stay host data, never renderer vocabulary. */
export interface CatalogEntry {
    readonly id: string;
    readonly label: string;
    readonly href: string;
    readonly title: string;
}

export interface CatalogSource {
    readonly id: string;
    readonly label: string;
    readonly title?: string;
}

export const catalogEntries = <T extends CatalogSource>(
    items: readonly T[],
    hrefFor: (id: string, item: T) => string,
    titleFor?: (id: string, item: T) => string,
): readonly CatalogEntry[] =>
    items.map((item) => ({
        id: item.id,
        label: item.label,
        href: hrefFor(item.id, item),
        title: item.title ?? titleFor?.(item.id, item) ?? item.label,
    }));
