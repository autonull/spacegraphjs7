import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
export declare class InstancedShapeNode extends Node {
    private instanceIndex;
    private colorHex;
    constructor(sg: SpaceGraph, spec: NodeSpec);
    private registerInstance;
    private rebuildInstancedMesh;
    private updateInstanceMatrix;
    private updateInstanceColor;
    updatePosition(x: number, y: number, z: number): void;
    updateSpec(updates: Partial<NodeSpec>): void;
    dispose(): void;
}
