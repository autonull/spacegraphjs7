import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
/**
 * SceneNode — Loads an external 3D model (GLTF/GLB) into the node.
 * Automatically computes bounding box and scales it to fit requested size.
 *
 * data options:
 *   url         : Model URL (required)
 *   targetSize  : Scale model so its max bounds match this size (default 100)
 *   autoCenter  : Center the model's geometry origin (default true)
 */
export declare class SceneNode extends Node {
    private modelRoot?;
    private loader;
    private boundingBoxHelper?;
    constructor(sg: SpaceGraph, spec: NodeSpec);
    private loadModel;
    updateSpec(updates: Partial<NodeSpec>): void;
    dispose(): void;
}
