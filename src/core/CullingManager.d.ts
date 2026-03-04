import type { SpaceGraph } from '../SpaceGraph';
export declare class CullingManager {
    private sg;
    private frustum;
    private projScreenMatrix;
    constructor(sg: SpaceGraph);
    update(): void;
}
