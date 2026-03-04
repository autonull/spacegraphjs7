import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';
import { Edge } from './Edge';
/**
 * LabeledEdge — Straight edge with a mid-point text label rendered via CSS2D.
 *
 * data options:
 *   label     : string (falls back to spec.id)
 *   color     : line hex color (default 0x888888)
 *   labelColor: CSS color string (default '#ffffff')
 *   fontSize  : CSS font-size (default '12px')
 */
export declare class LabeledEdge extends Edge {
    private labelEl;
    private labelObject;
    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node);
    private _positionLabel;
    update(): void;
    updateSpec(updates: Partial<EdgeSpec>): void;
    dispose(): void;
}
