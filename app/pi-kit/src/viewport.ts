/** Zoom math shared by the hosts; each host supplies its own clamp range. */
export interface ZoomRange {
    readonly min: number;
    readonly max: number;
}
export const clampZoom = (
    zoom: number,
    factor: number,
    { min, max }: ZoomRange,
): number => Math.max(min, Math.min(max, zoom * factor));
/** Fit settings hosts use when no view-specific insets or padding are required. */
export const DEFAULT_FIT_OPTIONS = { minScale: 0.5, padding: 48 } as const;
export interface ViewportHost<View extends { readonly zoom: number }, Options = unknown> {
    readonly getViewport: () => View;
    readonly setViewport: (viewport: View) => void;
    readonly fit: (ids: readonly string[] | undefined, options?: Options) => void;
}
/** The viewport verbs both hosts expose; hosts add their own telemetry and band policy around them. */
export const createViewportController = <
    View extends { readonly zoom: number },
    Options = unknown,
>(
    renderer: ViewportHost<View, Options>,
    range: ZoomRange,
) => ({
    zoomBy(factor: number): number {
        const viewport = renderer.getViewport();
        const zoom = clampZoom(viewport.zoom, factor, range);
        renderer.setViewport({ ...viewport, zoom });
        return zoom;
    },
    fit(ids?: readonly string[], options?: Options): void {
        renderer.fit(ids, options);
    },
});
