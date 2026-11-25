/**
 * Appends a value to a map's bucket, creating the bucket on first use. Map-backed grouping is a
 * recurring shape across layouts, queries and indexes; one helper keeps the boilerplate identical.
 */
export const appendTo = <Key, Value>(buckets: Map<Key, Value[]>, key: Key, value: Value): void => {
    const bucket = buckets.get(key);
    if (bucket) bucket.push(value);
    else buckets.set(key, [value]);
};
/** Children by parent id plus the set of ids that have an incoming edge. */
export const childrenByID = <Edge>(
    ids: readonly string[],
    edges: Iterable<Edge>,
    sourceOf: (edge: Edge) => string,
    targetOf: (edge: Edge) => string,
): { children: Map<string, string[]>; parents: Set<string> } => {
    const children = new Map<string, string[]>(ids.map((id): [string, string[]] => [id, []]));
    const parents = new Set<string>();
    for (const edge of edges) {
        const source = sourceOf(edge);
        const target = targetOf(edge);
        children.get(source)?.push(target);
        parents.add(target);
    }
    return { children, parents };
};
