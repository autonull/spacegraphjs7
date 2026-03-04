import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
/**
 * GlobeNode — A 3D sphere node, optionally with a texture map.
 * Demonstrates a primitive-based 3D node.
 *
 * data options:
 *   radius     : radius of the globe (default 50)
 *   textureUrl : URL to an equirectangular map (optional)
 *   color      : base color if no texture (default 0x3b82f6)
 *   wireframe  : boolean overlay wireframe (default true)
 *   segments   : sphere segments (default 32)
 */
export declare class GlobeNode extends Node {
    private mesh;
    private wireframe?;
    constructor(sg: SpaceGraph, spec: NodeSpec);
    updateSpec(updates: Partial<NodeSpec>): void;
    dispose(): void;
}
