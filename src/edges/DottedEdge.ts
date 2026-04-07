import { Edge } from './Edge';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeData, EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

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
    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        const dottedSpec: EdgeSpec = {
            ...spec,
            data: {
                dashed: true,
                dashSize: 8,
                gapSize: 6,
                color: 0x888888,
                thickness: 2,
                ...spec.data,
            } as EdgeData,
        };
        super(sg, dottedSpec, source, target);
    }
}
