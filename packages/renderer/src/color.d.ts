/**
 * Colour helpers for the renderer contract: the parse and normalize operations every adapter needs
 * to turn a host's CSS colour into something it can draw. Zero dependencies.
 */
/**
 * A CSS colour as the `0xRRGGBB` number a renderer draws with; undefined when it cannot be read.
 *
 * Reads 3, 6, and 8 digit hex (the alpha is dropped) and `rgb()`/`rgba()`.
 */
export declare function parseColor(value: string | undefined): number | undefined;
/**
 * The 6-digit hex form of a colour, or the value unchanged when it is not hex. A renderer that
 * rejects 8-digit hex (Cytoscape) normalizes every theme token through this.
 */
export declare function normalizeHexColor(value: string): string;
/**
 * The WCAG 2.1 relative luminance of a colour whose channels are already in 0..1.
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export declare function relativeLuminance(r: number, g: number, b: number): number;
/**
 * The WCAG contrast ratio between two relative luminances: `(L1 + 0.05) / (L2 + 0.05)`, where L1
 * is the lighter of the two.
 */
export declare function contrastRatioOf(l1: number, l2: number): number;
//# sourceMappingURL=color.d.ts.map