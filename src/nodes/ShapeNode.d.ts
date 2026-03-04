import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
export declare class ShapeNode extends Node {
    private meshGeometry;
    private meshMaterial;
    private labelSprite?;
    constructor(sg: SpaceGraph, spec: NodeSpec);
    updateSpec(updates: Partial<NodeSpec>): void;
    private createLabel;
    dispose(): void;
}
