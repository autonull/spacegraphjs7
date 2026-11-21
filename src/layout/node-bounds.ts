export type NodeBounds = { width: number; height: number; depth: number };

export const DEFAULT_NODE_BOUNDS: NodeBounds = { width: 200, height: 100, depth: 1 };

/** Bounds declared by a node's data or class, before any render-dependent fallback. */
export function declaredNodeBounds(node: {
    data?: unknown;
    size?: unknown;
}): NodeBounds | undefined {
    const data = node.data as Record<string, unknown> | undefined;
    if (data && typeof data.width === 'number' && typeof data.height === 'number')
        return {
            width: data.width,
            height: data.height,
            depth: typeof data.depth === 'number' ? data.depth : 1,
        };

    const size = node.size as Record<string, unknown> | undefined;
    if (size && typeof size.width === 'number' && typeof size.height === 'number')
        return { width: size.width, height: size.height, depth: 1 };
}
