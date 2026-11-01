/**
 * The edge and node style rules every renderer adapter shares: confidence encodes thickness/opacity,
 * a dashed or dotted style is dashed whatever the confidence, and a card is a surface rather than a
 * shape. Zero dependencies — the contract package is where every adapter can reach them.
 */
import type { RenderEdge, RenderNode, RenderTheme } from './index';
/** How the contract's rules paint an edge. */
export type EdgeStyle = {
    /** The CSS colour of the edge. */
    color: string;
    /** The stroke width of the edge. */
    width: number;
    /** The opacity of the edge (0-1). */
    opacity: number;
    /** Whether the edge is drawn dashed. */
    dashed: boolean;
    /** Whether the edge was inferred rather than stated. */
    inferred: boolean;
};
/** Confidence levels for edges. */
export type EdgeConfidence = 'explicit' | 'structural' | 'inferred';
/**
 * The style an edge gets from the contract's rules. A renderer that draws dashes its own way —
 * Cytoscape through a class, SVG through `stroke-dasharray` — still reads the same colour, width
 * and dash decision from here.
 * Confidence encoding: explicit > structural > inferred (thicker, more opaque).
 */
export declare function edgeStyleFor(edge: RenderEdge, theme: RenderTheme): EdgeStyle;
/** A card is a node drawn as a surface rather than as a shape. */
export declare function isCardShape(shape: RenderNode['shape']): boolean;
//# sourceMappingURL=edge.d.ts.map