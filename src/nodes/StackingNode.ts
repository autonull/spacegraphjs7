import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { LayoutNode, stackingStrategy } from './LayoutNode';

export class StackingNode extends (LayoutNode as any) {
  static readonly typeName = 'StackingNode';

  constructor(sg?: SpaceGraph, spec?: NodeSpec) {
    super(sg!, spec as NodeSpec, stackingStrategy);
  }
}
