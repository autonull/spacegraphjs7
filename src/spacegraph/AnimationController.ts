import type { SpaceGraph } from '../SpaceGraph';
import { Performance } from '../core/constants';

export class AnimationController {
    #animationFrameId?: number;
    #lastTimestamp = 0;
    #animating = false;
    #scheduled = false;
    #continuousMode = false;

    constructor(readonly sg: SpaceGraph) {}

    get continuousMode(): boolean {
        return this.#continuousMode;
    }

    setContinuousMode(value: boolean): void {
        this.#continuousMode = value;
    }

    animate(timestamp = 0): void {
        if (this.sg.disposed) return;
        if (this.#continuousMode) {
            if (!this.#animating) return;
            this.#animationFrameId = requestAnimationFrame((t) => this.animate(t));
        }
        this.sg.renderer.beginFrameOptimization(timestamp);

        const delta =
            this.#lastTimestamp > 0 && timestamp > 0
                ? Math.min(
                      (timestamp - this.#lastTimestamp) / Performance.MS_PER_SEC,
                      Performance.MAX_DELTA_CLAMP,
                  )
                : Performance.DEFAULT_DELTA_TIME;
        this.#lastTimestamp = timestamp;

        this.sg.pluginManager.updateAll(delta);
        this.sg.cameraControls?.update();
        for (const node of this.sg.graph.nodes.values()) {
            if (node) node.onPreRender?.(delta);
        }
        for (const edge of this.sg.graph.edges.values()) {
            if (edge) edge.onPreRender?.(delta);
        }

        this.sg.reportViewport();
        this.sg.renderer.render();
    }

    requestFrame(): void {
        if (this.sg.disposed || this.#continuousMode || this.#scheduled) return;
        this.#scheduled = true;
        this.#animationFrameId = requestAnimationFrame((t) => {
            this.#scheduled = false;
            this.animate(t);
        });
    }

    render(): SpaceGraph {
        if (this.sg.disposed) return this.sg;
        this.#animating = true;
        if (this.#continuousMode) {
            this.#animationFrameId ??= requestAnimationFrame((t) => this.animate(t));
        } else {
            this.requestFrame();
        }
        return this.sg;
    }

    pause(): void {
        this.#animating = false;
        if (this.#animationFrameId) {
            cancelAnimationFrame(this.#animationFrameId);
            this.#animationFrameId = undefined;
        }
        this.#scheduled = false;
    }

    resume(): SpaceGraph {
        return this.render();
    }

    dispose(): void {
        this.pause();
    }
}
