export type CollectionChange<T> = {
    readonly id: string;
    readonly before: T;
    readonly after: T;
};

export type KeyedCollectionDiff<T> = {
    readonly added: readonly T[];
    readonly removed: readonly T[];
    readonly changed: readonly CollectionChange<T>[];
};

/** Canonical serialization: object keys sorted recursively; arrays keep their order. */
export const stableSerialize = (value: unknown): string => {
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
    if (value !== null && typeof value === 'object')
        return `{${Object.keys(value)
            .sort()
            .map(
                (key) =>
                    `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`,
            )
            .join(',')}}`;
    return JSON.stringify(value);
};

/**
 * Diff two id-keyed collections. `serialize` defines "changed"; the default is key-order
 * insensitive. Added and changed follow `after` order, removed follows `before` order.
 */
export const diffCollectionById = <T extends { readonly id: string }>(
    before: readonly T[],
    after: readonly T[],
    serialize: (item: T) => string = stableSerialize,
): KeyedCollectionDiff<T> => {
    const beforeByID = new Map<string, T>();
    for (const item of before) beforeByID.set(item.id, item);
    const afterByID = new Map<string, T>();
    const added: T[] = [];
    const changed: CollectionChange<T>[] = [];
    for (const item of after) {
        afterByID.set(item.id, item);
        const previous = beforeByID.get(item.id);
        if (!previous) added.push(item);
        else if (previous !== item && serialize(previous) !== serialize(item))
            changed.push({ id: item.id, before: previous, after: item });
    }
    return {
        added,
        removed: before.filter((item) => !afterByID.has(item.id)),
        changed,
    };
};
