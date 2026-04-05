import { LayoutNode, gridStrategy } from './LayoutNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class GridNode extends LayoutNode {
    constructor(sg?: SpaceGraph, spec?: NodeSpec) {
        super(sg!, spec as NodeSpec, gridStrategy, {
            columns: 3,
            cellWidth: 200,
            cellHeight: 150,
            gap: 20,
        });
    }
}
