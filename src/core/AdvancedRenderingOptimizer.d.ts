import type { SpaceGraph } from '../SpaceGraph';
export declare class AdvancedRenderingOptimizer {
    private sg;
    private lastTime;
    private frames;
    private fps;
    private checkInterval;
    private timeSinceLastCheck;
    isThrottled: boolean;
    constructor(sg: SpaceGraph);
    beginFrame(timestamp: number): void;
    private evaluatePerformance;
    getFPS(): number;
}
