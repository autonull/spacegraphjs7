import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { LayoutNode, splitStrategy } from './LayoutNode';

export class SplitNode extends LayoutNode {
  static readonly typeName: string = 'SplitNode';

  constructor(sg?: SpaceGraph, spec?: NodeSpec) {
    super(sg!, spec as NodeSpec, splitStrategy, {
      splitRatio: 0.5,
      splitAxis: 'horizontal',
    });
  }
}
