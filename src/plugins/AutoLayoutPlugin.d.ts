import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
export declare class AutoLayoutPlugin implements ISpaceGraphPlugin {
    readonly id = 'auto-layout';
    readonly name = 'Auto Layout';
    readonly version = '1.0.0';
    private sg;
    init(sg: SpaceGraph): void;
    onPreRender(delta: number): void;
    applyVisionCorrection(issues: any[]): void;
    fixOverlaps(overlaps: any[]): void;
    dispose(): void;
}
