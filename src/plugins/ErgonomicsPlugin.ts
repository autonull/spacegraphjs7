import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import * as THREE from 'three';

/**
 * InteractionSession records a single continuous interaction (like a drag or pan)
 * to evaluate the physical efficiency vs. jitter (direction changes).
 */
class InteractionSession {
    public path: THREE.Vector3[] = [];
    public startTime: number = Date.now();
    public endTime: number = 0;

    addPoint(x: number, y: number, z: number = 0) {
        this.path.push(new THREE.Vector3(x, y, z));
    }

    close() {
        this.endTime = Date.now();
    }

    getMetrics() {
        if (this.path.length < 2) return { efficiency: 1.0, jitter: 0.0, durationMs: 0 };

        let pathLength = 0;
        let jitterCount = 0;

        // Calculate total path distance and count directional reversals
        for (let i = 1; i < this.path.length; i++) {
            const p1 = this.path[i - 1];
            const p2 = this.path[i];
            const dist = p1.distanceTo(p2);
            pathLength += dist;

            if (i > 1) {
                // Jitter Check: if the dot product of consecutive motion vectors is negative, it's a reversal
                const dir1 = new THREE.Vector3().subVectors(p2, p1).normalize();
                const dir0 = new THREE.Vector3().subVectors(p1, this.path[i - 2]).normalize();
                if (dir1.dot(dir0) < -0.2) jitterCount++;
            }
        }

        const start = this.path[0];
        const end = this.path[this.path.length - 1];
        const displacement = start.distanceTo(end);

        const efficiency = pathLength > 0 ? displacement / pathLength : 1.0;
        const durationMs = this.endTime - this.startTime;

        // Jitter per second
        const jitter = durationMs > 0 ? (jitterCount / durationMs) * 1000 : 0;

        return { efficiency, jitter, durationMs };
    }
}

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

    private activeSessions: Map<string, InteractionSession> = new Map();

    private _listenToInteractions(): void {
        // Track Node Dragging
        this.sg.events.on('interaction:dragstart', (payload) => {
            if (!payload || !payload.node) return;
            this.activeSessions.set(`drag-${payload.node.id}`, new InteractionSession());
        });

        this.sg.events.on('interaction:drag', (payload) => {
            if (!payload || !payload.node) return;
            const session = this.activeSessions.get(`drag-${payload.node.id}`);
            if (session) session.addPoint(payload.node.position.x, payload.node.position.y);
        });

        this.sg.events.on('interaction:dragend', (payload) => {
            if (!payload || !payload.node) return;
            const session = this.activeSessions.get(`drag-${payload.node.id}`);
            if (session) {
                session.close();
                this._accumulateMetrics(session);
                this.activeSessions.delete(`drag-${payload.node.id}`);
            }
        });

        // Track Camera Panning
        let camSession: InteractionSession | null = null;
        this.sg.events.on('camera:move', (payload) => {
            if (!payload || !payload.position) return;
            if (!camSession) {
                camSession = new InteractionSession();
                // Close it after 500ms of inactivity (debounce essentially)
                const checkEnd = setInterval(() => {
                    if (Date.now() - camSession!.path[camSession!.path.length - 1]?.z > 500) {
                        camSession!.close();
                        this._accumulateMetrics(camSession!);
                        camSession = null;
                        clearInterval(checkEnd);
                    }
                }, 500);
            }
            camSession.addPoint(payload.position.x, payload.position.y, Date.now()); // hack: stash timestamp in Z temporarily for the debounce check above
        });
    }

    private _accumulateMetrics(session: InteractionSession) {
        const { efficiency, jitter } = session.getMetrics();

        // Exponential moving average for metrics
        const alpha = 0.1;
        this.metrics.avgEfficiency = alpha * efficiency + (1 - alpha) * this.metrics.avgEfficiency;
        this.metrics.avgJitter = alpha * jitter + (1 - alpha) * this.metrics.avgJitter;
        // Only count valid non-accidental clicks as full interactions
        if (session.path.length > 1) {
            this.metrics.totalInteractions++;
        }
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

    public startCalibrationRound(
        configA: Partial<typeof this.config>,
        configB: Partial<typeof this.config>,
        interactionsPerRound = 10,
    ) {
        this.calibrating = true;

        const roundCount = 0;
        let activeConfig: 'A' | 'B' = 'A';

        // Stash baseline to restore or compare later
        const baselineConfig = { ...this.config };

        // Reset metrics for the test
        const scores = {
            A: { efficiency: 0, jitter: 0 },
            B: { efficiency: 0, jitter: 0 },
        };

        this.updateConfig(configA);
        this.metrics.totalInteractions = 0;

        const checkRound = setInterval(() => {
            if (!this.calibrating) {
                clearInterval(checkRound);
                return;
            }

            if (this.metrics.totalInteractions >= interactionsPerRound) {
                // Record the score for this variant
                scores[activeConfig].efficiency = this.metrics.avgEfficiency;
                scores[activeConfig].jitter = this.metrics.avgJitter;

                if (activeConfig === 'A') {
                    // Switch to B
                    activeConfig = 'B';
                    this.updateConfig(configB);
                    this.metrics.totalInteractions = 0;
                    this.metrics.avgEfficiency = 1.0;
                    this.metrics.avgJitter = 0.0;
                } else {
                    // Finished both A and B. Compare.
                    clearInterval(checkRound);
                    this.calibrating = false;

                    // Lower jitter and higher efficiency wins
                    // A simple score heuristic: Efficiency (0-1) - normalized jitter penalties
                    const scoreA = scores.A.efficiency - scores.A.jitter * 0.1;
                    const scoreB = scores.B.efficiency - scores.B.jitter * 0.1;

                    const winner = scoreA >= scoreB ? configA : configB;

                    // Apply winning config permanently
                    this.updateConfig({ ...baselineConfig, ...winner });
                    console.log(
                        `[Ergonomics] Calibration complete. Winner: Variant ${scoreA >= scoreB ? 'A' : 'B'}`,
                    );
                    this.sg.events.emit('ergonomics:calibrated' as any, { winner, scores });
                }
            }
        }, 1000);
    }

    onPreRender(_delta: number): void {
        // Handled by event accumulation directly
    }
}
