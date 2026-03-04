import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
export declare class ForceLayout implements ISpaceGraphPlugin {
    readonly id = 'force-layout';
    readonly name = 'Force Layout';
    readonly version = '1.0.0';
    private sg;
    settings: {
        attraction: number;
        repulsion: number;
        damping: number;
        enabled: boolean;
    };
    private velocity;
    init(sg: SpaceGraph): void;
    onPreRender(delta: number): void;
    update(): void;
}
