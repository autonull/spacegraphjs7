export type NodeBounds = { width: number; height: number; depth: number };

/** Extra padding between nodes used by layout defaults. */
export const DEFAULT_NODE_PADDING = 20;

/** Half a node's bounding-box diagonal, plus optional padding. */
export const diagonalRadius = (
    { width, height }: Pick<NodeBounds, 'width' | 'height'>,
    padding = 0,
): number => Math.hypot(width, height) / 2 + padding;

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

/** Declared bounds, then a render-dependent measurement, then the documented default. */
export function resolveNodeBounds(
    node: { data?: unknown; size?: unknown },
    measure?: () => NodeBounds | undefined,
): NodeBounds {
    return declaredNodeBounds(node) ?? measure?.() ?? { ...DEFAULT_NODE_BOUNDS };
}
