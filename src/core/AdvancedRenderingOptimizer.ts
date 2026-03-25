import type { SpaceGraph } from '../SpaceGraph';
import type { ForceLayout } from '../plugins/ForceLayout';

const OPTIMIZER_CONFIG = {
    CHECK_INTERVAL_MS: 1000,
    MIN_FPS_THRESHOLD: 30,
    MAX_FPS_THRESHOLD: 55,
} as const;

export class AdvancedRenderingOptimizer {
    private readonly sg: SpaceGraph;
    private lastTime: number = 0;
    private frames: number = 0;
    private fps: number = 60;
    private timeSinceLastCheck: number = 0;

    public isThrottled: boolean = false;

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

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
            this.evaluatePerformance();

            this.frames = 0;
            this.timeSinceLastCheck = 0;
        }
    }

    private evaluatePerformance(): void {
        if (this.fps < OPTIMIZER_CONFIG.MIN_FPS_THRESHOLD && !this.isThrottled) {
            this.isThrottled = true;
            this._toggleHeavyPlugins(false);
            return;
        }

        if (this.fps >= OPTIMIZER_CONFIG.MAX_FPS_THRESHOLD && this.isThrottled) {
            this.isThrottled = false;
            this._toggleHeavyPlugins(true);
        }
    }

    private _toggleHeavyPlugins(enabled: boolean): void {
        const layoutPlugin = this.sg.pluginManager.getPlugin('LayoutPlugin') as ForceLayout | undefined;
        if (layoutPlugin?.settings !== undefined) {
            layoutPlugin.settings.enabled = enabled;
        }
    }

    public getFPS(): number {
        return this.fps;
    }
}
