import { Edge } from './Edge';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';
export declare class FlowEdge extends Edge {
    private dashOffset;
    private flowSpeed;
    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node);
    updateSpec(updates: Partial<EdgeSpec>): void;
    update(): void;
}
