import { LayoutNode, switchStrategy } from './LayoutNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class SwitchNode extends LayoutNode {
    constructor(sg?: SpaceGraph, spec?: NodeSpec) {
        super(sg!, spec as NodeSpec, switchStrategy, { activeIndex: 0 });
        if (spec?.data) {
            const d = spec.data as Record<string, unknown>;
            if (typeof d.activeIndex === 'number') this.activeIndex = d.activeIndex;
        }
    }

    get activeIndex(): number {
        return this['params'].activeIndex as number;
    }

    set activeIndex(value: number) {
        this['params'].activeIndex = value;
    }
}
