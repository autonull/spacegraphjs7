// SpaceGraphJS - StackingNode
// Layout container that stacks children at the same position (z-order)

import * as THREE from 'three';
import { GroupNode } from './GroupNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class StackingNode extends GroupNode {
    constructor(sg?: SpaceGraph, spec?: NodeSpec) {
        super(sg, spec);
    }

    onPreRender(_dt: number): void {
        for (const child of this.children) {
            child.position.copy(this.position);
        }
    }
}
