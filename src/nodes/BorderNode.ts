import { LayoutNode, borderStrategy } from './LayoutNode';
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

export class BorderNode extends LayoutNode {
    regions = new Map<BorderRegion, string>();

    constructor(sg?: SpaceGraph, spec?: NodeSpec) {
        super(sg, spec as NodeSpec, borderStrategy, { regions: {} });
        if (spec?.data?.regions) {
            const r = (spec.data as Record<string, unknown>).regions as Record<string, string>;
            for (const [key, value] of Object.entries(r)) {
                this.regions.set(key as BorderRegion, value);
            }
            this['params'].regions = Object.fromEntries(this.regions);
        }
    }

    setRegion(region: BorderRegion, childId: string): void {
        this.regions.set(region, childId);
        (this['params'] as Record<string, unknown>).regions = Object.fromEntries(this.regions);
    }
}
