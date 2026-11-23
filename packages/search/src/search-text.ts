import type { GraphNode } from '@spacegraphjs/shared';

/** Search function signature for custom ranking. */
export type SearchTextFn = (node: GraphNode) => string[];

/** Default search text extractor: label, summary and the common data fields. */
export const defaultSearchText: SearchTextFn = (node: GraphNode) =>
    [
        node.label,
        node.summary,
        node.data?.name as string | undefined,
        node.data?.path as string | undefined,
        node.data?.command as string | undefined,
        node.data?.input ? JSON.stringify(node.data.input) : undefined,
    ].filter((value): value is string => !!value);
