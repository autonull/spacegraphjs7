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
export function edgeStyleFor(edge: RenderEdge, theme: RenderTheme): EdgeStyle {
  const confidence = edge.confidence ?? 'structural';
  const inferred = confidence === 'inferred';

  // Confidence-based styling: explicit > structural > inferred
  let width: number;
  let opacity: number;
  let color: string;

  switch (confidence) {
    case 'explicit':
      width = 3;
      opacity = 1.0;
      color = theme.edge;
      break;
    case 'structural':
      width = 2;
      opacity = 0.7;
      color = theme.edge;
      break;
    case 'inferred':
      width = 1;
      opacity = 0.4;
      color = theme.edgeMuted;
      break;
    default:
      width = 2;
      opacity = 0.7;
      color = theme.edge;
  }

  return {
    color,
    width,
    opacity,
    dashed: inferred || edge.style === 'dashed' || edge.style === 'dotted',
    inferred,
  };
}

/** A card is a node drawn as a surface rather than as a shape. */
export function isCardShape(shape: RenderNode['shape']): boolean {
  return shape === 'card' || shape === 'panel';
}
