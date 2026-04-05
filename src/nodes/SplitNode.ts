import { LayoutNode, splitStrategy } from './LayoutNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class SplitNode extends LayoutNode {
    constructor(sg?: SpaceGraph, spec?: NodeSpec) {
        super(sg!, spec as NodeSpec, splitStrategy, {
            splitRatio: 0.5,
            splitAxis: 'horizontal',
        });
    }
}
