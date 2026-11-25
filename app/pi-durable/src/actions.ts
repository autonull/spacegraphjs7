/** Committed entry ids live in the node suffix; conversations, runs and tasks are not entries. */
export const entryIDFromNode = (id: string | undefined): string | undefined =>
    /^d:[^:]+:(?:entry|tool):(.+)$/.exec(id ?? '')?.[1];
