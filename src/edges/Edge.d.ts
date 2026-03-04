import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';
export declare class Edge {
    id: string;
    sg: SpaceGraph;
    source: Node;
    target: Node;
    data: any;
    object: THREE.Line;
    geometry: THREE.BufferGeometry;
    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node);
    updateSpec(updates: Partial<EdgeSpec>): void;
    update(): void;
    dispose(): void;
}
