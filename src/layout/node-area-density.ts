/** A node box, in layout units, as fed to the density solver. */
export interface DensityNode {
    readonly width?: number;
    readonly height?: number;
}

export interface NodeAreaDensityInput {
    /** Node boxes before any scale is applied. */
    readonly nodes: readonly DensityNode[];
    /** The surface the layout must fit, in CSS pixels. */
    readonly viewport: { readonly width: number; readonly height: number };
    /** Target fraction of the surface covered by node boxes; a hint, not a hard guarantee. */
    readonly nodesAreaDensity: number;
    /** Upper bound on the uniform scale. Default 3. */
    readonly maxScale?: number;
    /** Correction passes; area grows with scale², so a few passes converge. Default 3. */
    readonly passes?: number;
}

export interface NodeAreaDensity {
    /** Uniform scale applied to every node box, preserving their relative areas. */
    readonly scale: number;
    /** Coverage at the returned scale, before collision slack. */
    readonly measured: number;
    readonly passes: number;
}

const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

const DEFAULT_NODE = 64;
const areaOf = (node: DensityNode): number =>
    Math.max(1, node.width ?? DEFAULT_NODE) * Math.max(1, node.height ?? DEFAULT_NODE);

/**
 * Iteratively approximates a target node-area density across the whole graph. One authority returns
 * a single uniform scale, so every consumer (CSS card, renderer footprint, layout collision) grows
 * by the same factor and node-to-node proportions never change.
 */
export const solveNodeAreaDensity = ({
    nodes,
    viewport,
    nodesAreaDensity,
    maxScale = 3,
    passes = 3,
}: NodeAreaDensityInput): NodeAreaDensity => {
    const surface = Math.max(1, viewport.width * viewport.height);
    const base = nodes.reduce((sum, node) => sum + areaOf(node), 0);
    if (!base) return { scale: 1, measured: 0, passes: 0 };
    const target = clamp(nodesAreaDensity, 0.05, 0.9);
    const bound = Math.max(1, maxScale);
    let scale = 1;
    let measured = base / surface;
    let used = 0;
    for (let pass = 0; pass < Math.max(1, passes); pass++) {
        used = pass + 1;
        if (Math.abs(measured - target) < 0.01) break;
        const next = clamp(scale * Math.sqrt(target / measured), 1, bound);
        if (next === scale) break;
        scale = next;
        measured = (base * scale * scale) / surface;
    }
    return { scale, measured: Math.min(measured, target), passes: used };
};
