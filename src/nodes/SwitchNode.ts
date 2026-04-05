// SpaceGraphJS - SwitchNode
// Layout container that shows only one child at a time

import { GroupNode } from './GroupNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class SwitchNode extends GroupNode {
    activeIndex = 0;

    constructor(sg?: SpaceGraph, spec?: NodeSpec) {
        super(sg, spec);
        if (spec?.data) {
            const d = spec.data as Record<string, unknown>;
            if (typeof d.activeIndex === 'number') this.activeIndex = d.activeIndex;
        }
    }

    onPreRender(_dt: number): void {
        this.children.forEach((child, i) => {
            child.visible = i === this.activeIndex;
        });
    }
}
