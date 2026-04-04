import type { SpaceGraph } from '../SpaceGraph';

const OPTIMIZER_CONFIG = {
    CHECK_INTERVAL_MS: 250,
} as const;

export class AdvancedRenderingOptimizer {
    private lastTime: number = 0;
    private frames: number = 0;
    private fps: number = 60;
    private timeSinceLastCheck: number = 0;

    constructor(_sg: SpaceGraph) {}

    public beginFrame(timestamp: number): void {
        if (this.lastTime === 0) {
            this.lastTime = timestamp;
            return;
        }

        const delta = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.frames++;
        this.timeSinceLastCheck += delta;

        if (this.timeSinceLastCheck >= OPTIMIZER_CONFIG.CHECK_INTERVAL_MS) {
            this.fps = (this.frames * 1000) / this.timeSinceLastCheck;
            this.frames = 0;
            this.timeSinceLastCheck = 0;
        }
    }

    public getFPS(): number {
        return this.fps;
    }
}
