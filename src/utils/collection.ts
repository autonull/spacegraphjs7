/**
 * Appends a value to a map's bucket, creating the bucket on first use. Map-backed grouping is a
 * recurring shape across layouts, queries and indexes; one helper keeps the boilerplate identical.
 */
export const appendTo = <Key, Value>(buckets: Map<Key, Value[]>, key: Key, value: Value): void => {
    const bucket = buckets.get(key);
    if (bucket) bucket.push(value);
    else buckets.set(key, [value]);
};
