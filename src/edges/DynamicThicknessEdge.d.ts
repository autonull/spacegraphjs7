import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';
/**
 * DynamicThicknessEdge — A tube-based edge whose visual thickness reflects a
 * weight property.  Uses TubeGeometry (rebuilt on update) for true 3-D thickness
 * that scales correctly with zoom.
 *
 * data options:
 *   weight    : number 0–1 controlling thickness (default 0.5)
 *   minRadius : world-space tube radius at weight=0 (default 1)
 *   maxRadius : world-space tube radius at weight=1 (default 8)
 *   color     : hex color (default 0x3b82f6)
 *   segments  : tube radial segments (default 6)
 */
export declare class DynamicThicknessEdge {
    id: string;
    sg: SpaceGraph;
    source: Node;
    target: Node;
    data: any;
    object: THREE.Mesh;
    private geometry;
    private material;
    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node);
    private _buildGeometry;
    updateSpec(updates: Partial<EdgeSpec>): void;
    update(): void;
    dispose(): void;
}
