/**
 * A record's value for a key, or undefined when the record has no such key. The record keeps its
 * exact key type; the lookup itself is by string.
 */
export function lookup<Key extends string, Value>(
  record: Readonly<Record<Key, Value>>,
  key: string
): Value | undefined {
  return (record as Readonly<Record<string, Value | undefined>>)[key];
}
