// Renderer strategy selection for SpaceGraphJS.
// The host supplies thresholds and available renderers.

export type RendererStrategy = "svg-preview" | "spacegraph" | "cytoscape";

export interface RendererStrategyThresholds {
    /** Below this, a static SVG preview is cheaper than mounting a WebGL scene. */
    preview: number;
    /** Above this, the WebGL scene is above its recommended node count. */
    canvas: number;
}

export const DEFAULT_RENDERER_STRATEGY_THRESHOLDS: RendererStrategyThresholds = {
    preview: 50,
    canvas: 300,
} as const;

export interface RendererStrategyOptions {
    /** Whether the host registered the Cytoscape 2D renderer. */
    cytoscape?: boolean;
    /** Custom thresholds for strategy selection. */
    thresholds?: Partial<RendererStrategyThresholds>;
}

/**
 * The renderer a surface should ask for. The fallback is always SpaceGraph, so asking for a
 * renderer that is not registered never leaves the map blank.
 */
export function chooseRendererStrategy(
    nodeCount: number,
    options: RendererStrategyOptions = {},
): RendererStrategy {
    const thresholds = {
        ...DEFAULT_RENDERER_STRATEGY_THRESHOLDS,
        ...options.thresholds,
    };

    if (nodeCount < thresholds.preview) return "svg-preview";
    if (nodeCount <= thresholds.canvas) return "spacegraph";
    if (options.cytoscape) return "cytoscape";
    return "spacegraph";
}

/** Map the policy onto the renderer ids the canvas registry can mount. */
export function canvasRendererFor(_strategy: RendererStrategy): "spacegraph" {
    return "spacegraph";
}