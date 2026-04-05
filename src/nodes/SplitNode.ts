// SpaceGraphJS - SplitNode
// Layout container that splits children into two panes with a draggable divider

import * as THREE from 'three';
import { GroupNode } from './GroupNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class SplitNode extends GroupNode {
    splitRatio = 0.5;
    splitAxis: 'horizontal' | 'vertical' = 'horizontal';

    constructor(sg?: SpaceGraph, spec?: NodeSpec) {
        super(sg, spec);
        if (spec?.data) {
            const d = spec.data as Record<string, unknown>;
            if (typeof d.splitRatio === 'number') this.splitRatio = d.splitRatio;
            if (d.splitAxis === 'vertical' || d.splitAxis === 'horizontal')
                this.splitAxis = d.splitAxis;
        }
    }

    onPreRender(_dt: number): void {
        if (this.children.length < 2) return;

        const [first, second] = this.children;
        const totalWidth = (this.data?.width as number) ?? 600;
        const totalHeight = (this.data?.height as number) ?? 400;

        if (this.splitAxis === 'horizontal') {
            const w1 = totalWidth * this.splitRatio;
            const w2 = totalWidth * (1 - this.splitRatio);
            first.position.set(
                this.position.x - totalWidth / 2 + w1 / 2,
                this.position.y,
                this.position.z,
            );
            second.position.set(
                this.position.x + totalWidth / 2 - w2 / 2,
                this.position.y,
                this.position.z,
            );
        } else {
            const h1 = totalHeight * this.splitRatio;
            const h2 = totalHeight * (1 - this.splitRatio);
            first.position.set(
                this.position.x,
                this.position.y + totalHeight / 2 - h1 / 2,
                this.position.z,
            );
            second.position.set(
                this.position.x,
                this.position.y - totalHeight / 2 + h2 / 2,
                this.position.z,
            );
        }
    }
}
