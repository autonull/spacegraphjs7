// SpaceGraphJS - BorderNode
// Layout container with 9 regions: NORTH, SOUTH, EAST, WEST, CENTER, NW, NE, SW, SE

import * as THREE from 'three';
import { GroupNode } from './GroupNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export type BorderRegion =
    | 'NORTH'
    | 'SOUTH'
    | 'EAST'
    | 'WEST'
    | 'CENTER'
    | 'NW'
    | 'NE'
    | 'SW'
    | 'SE';

export class BorderNode extends GroupNode {
    regions = new Map<BorderRegion, string>();

    constructor(sg?: SpaceGraph, spec?: NodeSpec) {
        super(sg, spec);
        if (spec?.data?.regions) {
            const r = (spec.data as Record<string, unknown>).regions as Record<string, string>;
            for (const [key, value] of Object.entries(r)) {
                this.regions.set(key as BorderRegion, value);
            }
        }
    }

    setRegion(region: BorderRegion, childId: string): void {
        this.regions.set(region, childId);
    }

    onPreRender(_dt: number): void {
        const width = (this.data?.width as number) ?? 600;
        const height = (this.data?.height as number) ?? 400;
        const halfW = width / 2;
        const halfH = height / 2;

        const positions: Record<BorderRegion, [number, number]> = {
            CENTER: [0, 0],
            NORTH: [0, halfH],
            SOUTH: [0, -halfH],
            EAST: [halfW, 0],
            WEST: [-halfW, 0],
            NW: [-halfW, halfH],
            NE: [halfW, halfH],
            SW: [-halfW, -halfH],
            SE: [halfW, -halfH],
        };

        for (const child of this.children) {
            const region = this.regions.get(child.id as BorderRegion) ?? 'CENTER';
            const [dx, dy] = positions[region as BorderRegion];
            child.position.set(this.position.x + dx, this.position.y + dy, this.position.z);
        }
    }
}
