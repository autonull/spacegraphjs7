import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import { Edge, withEdgeData } from './Edge';

/**
 * DottedEdge — Dashed/dotted line edge.
 * Extends Edge with dashed configuration. The base Edge already supports
 * dashed lines, so this is a convenience subclass that sets sensible defaults.
 *
 * data options:
 *   color     : hex color (default 0x888888)
 *   dashSize  : world-space dash length (default 8)
 *   gapSize   : world-space gap length (default 6)
 *   thickness : line width (default 2)
 */
export class DottedEdge extends Edge {
  static readonly typeName: string = 'DottedEdge';

  constructor(sg: SpaceGraph | undefined, spec: EdgeSpec, source: Node, target: Node) {
    super(
      sg,
      withEdgeData(spec, {
        dashed: true,
        dashSize: 8,
        gapSize: 6,
        color: 0x888888,
        thickness: 2,
      }),
      source,
      target
    );
  }
}
