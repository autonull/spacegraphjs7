import { LayoutNode, sphereStrategy } from './LayoutNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class SphereLayoutNode extends LayoutNode {
    constructor(sg?: SpaceGraph, spec?: NodeSpec) {
        super(sg!, spec as NodeSpec, sphereStrategy, {
            radius: 200,
        });
    }
}
