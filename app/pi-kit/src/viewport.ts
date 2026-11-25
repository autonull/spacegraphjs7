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
