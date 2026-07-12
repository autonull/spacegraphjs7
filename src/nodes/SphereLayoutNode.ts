import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { LayoutNode, sphereStrategy } from './LayoutNode';

export class SphereLayoutNode extends (LayoutNode as any) {
  static readonly typeName = 'SphereLayoutNode';
  constructor(sg?: SpaceGraph, spec?: NodeSpec) {
    super(sg!, spec as NodeSpec, sphereStrategy, {
      radius: 200,
    });
  }
}
