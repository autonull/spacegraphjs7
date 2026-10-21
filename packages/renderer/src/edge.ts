/**
 * The edge and node style rules every renderer adapter shares: an inferred edge is muted and thin, a
 * dashed or dotted style is dashed whatever the confidence, and a card is a surface rather than a
 * shape. Zero dependencies — the contract package is where every adapter can reach them.
 */

import type { RenderEdge, RenderNode, RenderTheme } from './index';

/** How the contract's rules paint an edge. */
export type EdgeStyle = {
  /** The CSS colour of the edge. */
  color: string;
  /** The stroke width of the edge. */
  width: number;
  /** Whether the edge is drawn dashed. */
  dashed: boolean;
  /** Whether the edge was inferred rather than stated. */
  inferred: boolean;
};

/**
 * The style an edge gets from the contract's rules. A renderer that draws dashes its own way —
 * Cytoscape through a class, SVG through `stroke-dasharray` — still reads the same colour, width
 * and dash decision from here.
 */
export function edgeStyleFor(edge: RenderEdge, theme: RenderTheme): EdgeStyle {
  const inferred = edge.confidence === 'inferred';
  return {
    color: inferred ? theme.edgeMuted : theme.edge,
    width: inferred ? 1 : 2,
    dashed: inferred || edge.style === 'dashed' || edge.style === 'dotted',
    inferred,
  };
}

/** A card is a node drawn as a surface rather than as a shape. */
export function isCardShape(shape: RenderNode['shape']): boolean {
  return shape === 'card' || shape === 'panel';
}
