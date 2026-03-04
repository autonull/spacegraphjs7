import type { SpaceGraph } from '../SpaceGraph';

export class AdvancedRenderingOptimizer {
    private sg: SpaceGraph;
    private lastTime: number = 0;
    private frames: number = 0;
    private fps: number = 60;
    private checkInterval: number = 1000; // ms
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

        if (this.timeSinceLastCheck >= this.checkInterval) {
            this.fps = (this.frames * 1000) / this.timeSinceLastCheck;
            this.evaluatePerformance();

            this.frames = 0;
            this.timeSinceLastCheck = 0;
        }
    }

    private evaluatePerformance(): void {
        // If FPS drops below 30, enable throttling to degrade gracefully
        if (this.fps < 30) {
            if (!this.isThrottled) {
                console.warn(
                    `[AdvancedRenderingOptimizer] FPS dropped to ${this.fps.toFixed(1)}. Throttling enabled.`,
                );
                this.isThrottled = true;

                // Example of graceful degradation: disable heavy physics updates or CSS rendering
                const layoutPlugin: any = this.sg.pluginManager.getPlugin('LayoutPlugin');
                if (layoutPlugin && typeof layoutPlugin.settings !== 'undefined') {
                    layoutPlugin.settings.enabled = false;
                }
            }
        } else if (this.fps >= 55) {
            if (this.isThrottled) {
                console.log(
                    `[AdvancedRenderingOptimizer] FPS recovered to ${this.fps.toFixed(1)}. Throttling disabled.`,
                );
                this.isThrottled = false;

                // Re-enable plugins
                const layoutPlugin: any = this.sg.pluginManager.getPlugin('LayoutPlugin');
                if (layoutPlugin && typeof layoutPlugin.settings !== 'undefined') {
                    layoutPlugin.settings.enabled = true;
                }
            }
        }
    }

    public getFPS(): number {
        return this.fps;
    }
}
