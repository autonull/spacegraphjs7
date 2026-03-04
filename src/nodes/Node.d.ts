import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
export declare class Node {
    id: string;
    sg: SpaceGraph;
    label?: string;
    data: any;
    object: THREE.Object3D;
    position: THREE.Vector3;
    constructor(sg: SpaceGraph, spec: NodeSpec);
    updateSpec(updates: Partial<NodeSpec>): void;
    updatePosition(x: number, y: number, z: number): void;
    /**
     * Cleanly destroy this node and recursively free geometry, materials, and textures
     * to prevent WebGL context memory leaks.
     */
    dispose(): void;
}
