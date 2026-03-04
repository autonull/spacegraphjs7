import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
export declare class AutoColorPlugin implements ISpaceGraphPlugin {
    readonly id = 'auto-color';
    readonly name = 'Auto Color';
    readonly version = '1.0.0';
    private sg;
    init(sg: SpaceGraph): void;
    onPreRender(delta: number): void;
    private getLuminance;
    private getContrastRatio;
    private getCompliantColor;
    applyVisionCorrection(issues: any[]): void;
    dispose(): void;
}
