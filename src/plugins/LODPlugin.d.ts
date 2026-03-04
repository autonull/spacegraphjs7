import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
export declare class LODPlugin implements ISpaceGraphPlugin {
    readonly id = 'lod';
    readonly name = 'Level of Detail';
    readonly version = '1.0.0';
    private sg;
    private maxDistance;
    init(sg: SpaceGraph): void;
    onPreRender(delta: number): void;
}
