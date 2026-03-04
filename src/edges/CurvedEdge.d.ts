import { Edge } from './Edge';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';
export declare class CurvedEdge extends Edge {
    private curve;
    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node);
    private getControlPoint;
    update(): void;
}
