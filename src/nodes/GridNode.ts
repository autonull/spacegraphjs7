// SpaceGraphJS - GridNode
// Layout container that arranges children in a grid pattern

import * as THREE from 'three';
import { GroupNode } from './GroupNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class GridNode extends GroupNode {
    columns = 3;
    cellWidth = 200;
    cellHeight = 150;
    gap = 20;

    constructor(sg?: SpaceGraph, spec?: NodeSpec) {
        super(sg, spec);
        if (spec?.data) {
            const d = spec.data as Record<string, unknown>;
            if (typeof d.columns === 'number') this.columns = d.columns;
            if (typeof d.cellWidth === 'number') this.cellWidth = d.cellWidth;
            if (typeof d.cellHeight === 'number') this.cellHeight = d.cellHeight;
            if (typeof d.gap === 'number') this.gap = d.gap;
        }
    }

    onPreRender(_dt: number): void {
        this.children.forEach((child, i) => {
            const col = i % this.columns;
            const row = Math.floor(i / this.columns);
            child.position.set(
                this.position.x + col * (this.cellWidth + this.gap),
                this.position.y - row * (this.cellHeight + this.gap),
                this.position.z,
            );
        });
    }
}
