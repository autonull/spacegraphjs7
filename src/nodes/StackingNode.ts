import { LayoutNode, stackingStrategy } from './LayoutNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class StackingNode extends LayoutNode {
    constructor(sg?: SpaceGraph, spec?: NodeSpec) {
        super(sg, spec as NodeSpec, stackingStrategy);
    }
}
