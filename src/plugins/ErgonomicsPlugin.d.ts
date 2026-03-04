import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
/**
 * ErgonomicsPlugin — Tracks user interaction quality and adapts camera feel.
 *
 * Implements the RLFP (Recursive Least-Frequency Preference)
 * calibration loop testing variants A vs B.
 *
 * Tracked metrics:
 *   totalInteractions  : cumulative drag/zoom events
 *   avgEfficiency      : path-length / displacement ratio (1 = perfectly straight)
 *   avgJitter          : direction reversals per second
 */
export declare class ErgonomicsPlugin implements ISpaceGraphPlugin {
    readonly id = 'ergonomics-plugin';
    readonly name = 'Ergonomics';
    readonly version = '1.0.0';
    private sg;
    config: {
        targetNodeSizePx: number;
        dampingFactor: number;
        panSpeed: number;
        zoomSpeed: number;
    };
    metrics: {
        totalInteractions: number;
        avgEfficiency: number;
        avgJitter: number;
    };
    /**
     * Whether the calibration UI is currently active.
     * Full CalibrationManager implementation is deferred to future effort.
     */
    calibrating: boolean;
    init(sg: SpaceGraph): void;
    private _applyConfig;
    private activeSessions;
    private _listenToInteractions;
    private _accumulateMetrics;
    /** Update config and re-apply to camera. */
    updateConfig(partial: Partial<typeof this.config>): void;
    /** Returns a snapshot of current ergonomic metrics. */
    getMetrics(): {
        totalInteractions: number;
        avgEfficiency: number;
        avgJitter: number;
    };
    startCalibrationRound(
        configA: Partial<typeof this.config>,
        configB: Partial<typeof this.config>,
        interactionsPerRound?: number,
    ): void;
    onPreRender(_delta: number): void;
}
