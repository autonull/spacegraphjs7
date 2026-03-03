import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';

/**
 * ErgonomicsPlugin — Tracks user interaction quality and adapts camera feel.
 *
 * Scaffold implementing the RLFP (Recursive Least-Frequency Preference)
 * calibration loop described in spacegraphjs5's ErgonomicsPlugin.
 *
 * Tracked metrics:
 *   totalInteractions  : cumulative drag/zoom events
 *   avgEfficiency      : path-length / displacement ratio (1 = perfectly straight)
 *   avgJitter          : direction reversals per second
 *
 * TODO (future effort):
 *   - Wire to InteractionPlugin events to record real sessions
 *   - Implement CalibrationManager A/B rounds
 *   - Persist config to localStorage
 */
export class ErgonomicsPlugin implements ISpaceGraphPlugin {
    readonly id = 'ergonomics-plugin';
    readonly name = 'Ergonomics';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    public config = {
        targetNodeSizePx: 40,
        dampingFactor: 0.12,
        panSpeed: 1.0,
        zoomSpeed: 1.0,
    };

    public metrics = {
        totalInteractions: 0,
        avgEfficiency: 1.0,
        avgJitter: 0.0,
    };

    /**
     * Whether the calibration UI is currently active.
     * Full CalibrationManager implementation is deferred to future effort.
     */
    public calibrating = false;

    init(sg: SpaceGraph): void {
        this.sg = sg;
        this._applyConfig();
        this._listenToInteractions();
    }

    private _applyConfig(): void {
        // Hook into camera controls if available
        const cam = (this.sg as any).cameraControls;
        if (!cam) return;
        if ('dampingFactor' in cam) cam.dampingFactor = this.config.dampingFactor;
        if ('panSpeed' in cam) cam.panSpeed = this.config.panSpeed;
        if ('zoomSpeed' in cam) cam.zoomSpeed = this.config.zoomSpeed;
    }

    private _listenToInteractions(): void {
        this.sg.events.on('node:drag', () => {
            this.metrics.totalInteractions++;
        });
        this.sg.events.on('camera:moved', () => {
            this.metrics.totalInteractions++;
        });
    }

    /** Update config and re-apply to camera. */
    updateConfig(partial: Partial<typeof this.config>): void {
        this.config = { ...this.config, ...partial };
        this._applyConfig();
    }

    /** Returns a snapshot of current ergonomic metrics. */
    getMetrics() {
        return { ...this.metrics };
    }

    onPreRender(_delta: number): void {
        // Future: run calibration tick
    }
}
